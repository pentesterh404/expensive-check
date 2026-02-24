"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  role: "ADMIN" | "USER";
};

export function UserManagerPanel({
  users,
  currentAdminId
}: {
  users: UserRow[];
  currentAdminId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    displayName: ""
  });
  const [editForm, setEditForm] = useState({
    userId: "",
    email: "",
    password: "",
    displayName: ""
  });
  const [dbDeleteResult, setDbDeleteResult] = useState<{
    target: string;
    result: Record<string, number>;
  } | null>(null);

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      (u.displayName ?? "").toLowerCase().includes(q)
    );
  });

  function resetMessages() {
    setError(null);
    setDbDeleteResult(null);
  }

  function toggleSelected(userId: string) {
    setSelectedIds((ids) => (ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]));
  }

  async function createUser() {
    resetMessages();
    startTransition(async () => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createForm.email,
          password: createForm.password,
          displayName: createForm.displayName || null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to create user");
        return;
      }
      setCreateForm({ email: "", password: "", displayName: "" });
      setShowCreateForm(false);
      router.refresh();
    });
  }

  function openEditSelected() {
    if (selectedIds.length !== 1) return;
    const user = users.find((u) => u.id === selectedIds[0] && u.role !== "ADMIN");
    if (!user) return;
    resetMessages();
    setEditForm({
      userId: user.id,
      email: user.email,
      password: "",
      displayName: user.displayName ?? ""
    });
    setShowEditForm(true);
    setShowCreateForm(false);
  }

  async function saveEdit() {
    if (!editForm.userId) return;
    resetMessages();
    startTransition(async () => {
      const payload: Record<string, unknown> = {
        email: editForm.email,
        displayName: editForm.displayName || null
      };
      if (editForm.password) payload.password = editForm.password;

      const res = await fetch(`/api/admin/users/${editForm.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to update user");
        return;
      }
      setShowEditForm(false);
      setEditForm({ userId: "", email: "", password: "", displayName: "" });
      router.refresh();
    });
  }

  function deleteUserDbByIds(ids: string[], label: string) {
    if (ids.length === 0) return;
    resetMessages();
    startTransition(async () => {
      for (const userId of ids) {
        await fetch("/api/deletedb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId })
        });
      }
      setDbDeleteResult({
        target: label,
        result: { processed_users: ids.length }
      });
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      router.refresh();
    });
  }

  function deleteSelectedDb() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete DB contents for ${selectedIds.length} selected user(s)?`)) return;
    void deleteUserDbByIds(selectedIds, `${selectedIds.length} selected user(s)`);
  }

  function deleteAdminDb() {
    const admin = users.find((u) => u.id === currentAdminId);
    if (!admin) return;
    if (!window.confirm(`Delete DB contents for admin account ${admin.email}?`)) return;
    void deleteUserDbByIds([admin.id], admin.email);
  }

  function deleteSelectedUsers() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected user account(s) and all related data?`)) return;
    resetMessages();
    startTransition(async () => {
      for (const userId of selectedIds) {
        await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      }
      setSelectedIds([]);
      setShowEditForm(false);
      router.refresh();
    });
  }

  const canEditSelected = selectedIds.length === 1;

  return (
    <div className="page">
      {showCreateForm && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Create User Account</h3>
          <div className="toolbar" style={{ display: "grid" }}>
            <input
              type="email"
              placeholder="Email"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
            />
            <input
              placeholder="Display name"
              value={createForm.displayName}
              onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))}
            />
            <input
              type="password"
              placeholder="Password (min 8 chars)"
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
            />
            <div className="toolbar">
              <button className="button" type="button" disabled={isPending} onClick={createUser}>
                {isPending ? "Processing..." : "Create User"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={isPending}
                onClick={() => setShowCreateForm(false)}
              >
                Close
              </button>
            </div>
          </div>
        </section>
      )}

      {showEditForm && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Edit Selected User</h3>
          <div className="toolbar" style={{ display: "grid" }}>
            <input
              type="email"
              placeholder="Email"
              value={editForm.email}
              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
            />
            <input
              placeholder="Display name"
              value={editForm.displayName}
              onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
            />
            <input
              type="password"
              placeholder="New password (optional)"
              value={editForm.password}
              onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
            />
            <div className="toolbar">
              <button className="button" type="button" disabled={isPending} onClick={saveEdit}>
                {isPending ? "Saving..." : "Save"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={isPending}
                onClick={() => setShowEditForm(false)}
              >
                Close
              </button>
            </div>
          </div>
        </section>
      )}

      {dbDeleteResult && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Delete DB Result</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Target: <strong>{dbDeleteResult.target}</strong>
          </p>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
{JSON.stringify(dbDeleteResult.result, null, 2)}
          </pre>
        </section>
      )}

      <section className="card">
        <h3 style={{ marginTop: 0 }}>User Accounts</h3>
        <div className="card" style={{ padding: 10, marginBottom: 12 }}>
          <div className="toolbar" style={{ alignItems: "center" }}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user (email / display name)"
              style={{ minWidth: 280, flex: "1 1 280px" }}
            />
            <span className="badge">{selectedIds.length} selected</span>
            <button
              className="button"
              type="button"
              disabled={isPending}
              onClick={() => {
                resetMessages();
                setShowCreateForm((v) => !v);
                setShowEditForm(false);
              }}
            >
              Create Account
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={isPending || !canEditSelected}
              style={{ borderColor: "#93c5fd", color: "#1d4ed8", background: "#eff6ff" }}
              onClick={openEditSelected}
            >
              Edit
            </button>
            <button
              className="button"
              type="button"
              disabled={isPending || selectedIds.length === 0}
              style={{ background: "#b42318", borderColor: "#b42318", color: "#fff" }}
              onClick={deleteSelectedUsers}
            >
              Delete User
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={isPending || selectedIds.length === 0}
              style={{ borderColor: "#d97706", color: "#b45309", background: "#fff7ed" }}
              onClick={deleteSelectedDb}
            >
              Delete DB
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={isPending}
              style={{ borderColor: "#d97706", color: "#b45309", background: "#fff7ed" }}
              onClick={deleteAdminDb}
            >
              Delete DB (Admin)
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={isPending || selectedIds.length === 0}
              onClick={() => setSelectedIds([])}
            >
              Clear Selection
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Select</th>
                <th>Email</th>
                <th>Display Name</th>
                <th>Role</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isAdmin = user.role === "ADMIN";
                return (
                  <tr key={user.id}>
                    <td>
                      {!isAdmin ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(user.id)}
                          onChange={() => toggleSelected(user.id)}
                          aria-label={`Select ${user.email}`}
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{user.email}</td>
                    <td>{user.displayName ?? "-"}</td>
                    <td>{user.role}</td>
                    <td>{new Date(user.createdAt).toLocaleString("en-US")}</td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No users match the search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {error && <div style={{ color: "#b42318", marginTop: 10 }}>{error}</div>}
      </section>
    </div>
  );
}
