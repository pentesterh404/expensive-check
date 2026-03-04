"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/components/ToastProvider";

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
  const PAGE_SIZE = 20;
  type PendingAction =
    | "create-user"
    | "save-edit"
    | "detail-save-edit"
    | "delete-users"
    | "delete-selected-db"
    | "delete-admin-db"
    | "detail-delete-user"
    | "detail-delete-db";

  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [showDetailEditForm, setShowDetailEditForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
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
  const activeUser = users.find((u) => u.id === activeUserId) ?? null;

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      (u.displayName ?? "").toLowerCase().includes(q)
    );
  });
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pagedUsers = filteredUsers.slice(pageStart, pageEnd);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  function readApiError(data: any, fallback: string) {
    if (typeof data?.error === "string" && data.error !== "Invalid payload") return data.error;
    const fieldErrors = data?.details?.fieldErrors;
    if (fieldErrors && typeof fieldErrors === "object") {
      const first = Object.entries(fieldErrors).find(
        ([, value]) => Array.isArray(value) && value.length > 0
      ) as [string, string[]] | undefined;
      if (first) return `${first[0]}: ${first[1][0]}`;
    }
    return data?.error || fallback;
  }

  function resetMessages() {
    setError(null);
    setDbDeleteResult(null);
  }

  function setActionError(message: string) {
    setError(message);
    showToast(message, "error");
  }

  function toggleSelected(userId: string) {
    setSelectedIds((ids) => (ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]));
  }

  async function createUser() {
    resetMessages();
    if (!createForm.email.trim()) {
      setActionError("email: Required");
      return;
    }
    if (createForm.password.length < 1) {
      setActionError("password: Required");
      return;
    }
    setPendingAction("create-user");
    startTransition(async () => {
      try {
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
          setActionError(readApiError(data, "Failed to create user"));
          return;
        }
        setCreateForm({ email: "", password: "", displayName: "" });
        setShowCreateForm(false);
        showToast("User created", "success");
        router.refresh();
      } finally {
        setPendingAction(null);
      }
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
    setPendingAction("save-edit");
    startTransition(async () => {
      try {
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
          setActionError(readApiError(data, "Failed to update user"));
          return;
        }
        setShowEditForm(false);
        setEditForm({ userId: "", email: "", password: "", displayName: "" });
        showToast("User updated", "success");
        router.refresh();
      } finally {
        setPendingAction(null);
      }
    });
  }

  function deleteUserDbByIds(
    ids: string[],
    label: string,
    action: "delete-selected-db" | "delete-admin-db" | "detail-delete-db"
  ) {
    if (ids.length === 0) return;
    resetMessages();
    setPendingAction(action);
    startTransition(async () => {
      try {
        const batchSize = 8;
        for (let i = 0; i < ids.length; i += batchSize) {
          const batch = ids.slice(i, i + batchSize);
          const responses = await Promise.all(
            batch.map((userId) =>
              fetch("/api/deletedb", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId })
              })
            )
          );
          const failed = responses.find((res) => !res.ok);
          if (failed) {
            const data = await failed.json().catch(() => ({}));
            setActionError(readApiError(data, "Failed to delete DB data"));
            return;
          }
        }
        setDbDeleteResult({
          target: label,
          result: { processed_users: ids.length }
        });
        showToast(`Deleted DB data for ${ids.length} user(s)`, "success");
        setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
        router.refresh();
      } finally {
        setPendingAction(null);
      }
    });
  }

  function deleteSelectedDb() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete DB contents for ${selectedIds.length} selected user(s)?`)) return;
    void deleteUserDbByIds(
      selectedIds,
      `${selectedIds.length} selected user(s)`,
      "delete-selected-db"
    );
  }

  function deleteAdminDb() {
    const admin = users.find((u) => u.id === currentAdminId);
    if (!admin) return;
    if (!window.confirm(`Delete DB contents for admin account ${admin.email}?`)) return;
    void deleteUserDbByIds([admin.id], admin.email, "delete-admin-db");
  }

  function deleteSelectedUsers() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected user account(s) and all related data?`)) return;
    resetMessages();
    setPendingAction("delete-users");
    startTransition(async () => {
      try {
        const batchSize = 8;
        for (let i = 0; i < selectedIds.length; i += batchSize) {
          const batch = selectedIds.slice(i, i + batchSize);
          const responses = await Promise.all(
            batch.map((userId) => fetch(`/api/admin/users/${userId}`, { method: "DELETE" }))
          );
          const failed = responses.find((res) => !res.ok);
          if (failed) {
            const data = await failed.json().catch(() => ({}));
            setActionError(readApiError(data, "Failed to delete selected users"));
            return;
          }
        }
        setSelectedIds([]);
        setShowEditForm(false);
        showToast(`Deleted ${selectedIds.length} user(s)`, "success");
        router.refresh();
      } finally {
        setPendingAction(null);
      }
    });
  }

  function openUserDetail(user: UserRow) {
    resetMessages();
    setActiveUserId(user.id);
    setShowDetailEditForm(false);
    setShowEditForm(false);
    setEditForm({
      userId: user.id,
      email: user.email,
      password: "",
      displayName: user.displayName ?? ""
    });
  }

  function startEditFromDetail() {
    if (!activeUser || activeUser.role === "ADMIN") return;
    setShowDetailEditForm(true);
    setShowCreateForm(false);
    setShowEditForm(false);
  }

  async function saveDetailEdit() {
    if (!activeUser || activeUser.role === "ADMIN") return;
    resetMessages();
    setPendingAction("detail-save-edit");
    startTransition(async () => {
      try {
        const payload: Record<string, unknown> = {
          email: editForm.email,
          displayName: editForm.displayName || null
        };
        if (editForm.password) payload.password = editForm.password;

        const res = await fetch(`/api/admin/users/${activeUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setActionError(readApiError(data, "Failed to update user"));
          return;
        }
        setShowDetailEditForm(false);
        setEditForm((f) => ({ ...f, password: "" }));
        showToast("User updated", "success");
        router.refresh();
      } finally {
        setPendingAction(null);
      }
    });
  }

  function deleteDetailUser() {
    if (!activeUser || activeUser.role === "ADMIN") return;
    if (!window.confirm(`Delete user ${activeUser.email} and all related data?`)) return;
    resetMessages();
    setPendingAction("detail-delete-user");
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/users/${activeUser.id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setActionError(readApiError(data, "Failed to delete user"));
          return;
        }
        setActiveUserId(null);
        setShowDetailEditForm(false);
        setSelectedIds((ids) => ids.filter((id) => id !== activeUser.id));
        showToast("User deleted", "success");
        router.refresh();
      } finally {
        setPendingAction(null);
      }
    });
  }

  function deleteDetailDb() {
    if (!activeUser) return;
    if (!window.confirm(`Delete DB contents for ${activeUser.email}?`)) return;
    void deleteUserDbByIds([activeUser.id], activeUser.email, "detail-delete-db");
  }

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
              placeholder="Password"
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
            />
            <div className="toolbar">
              <button className="button" type="button" disabled={isPending} onClick={createUser}>
                {isPending && pendingAction === "create-user" ? "Creating..." : "Create User"}
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
                {isPending && pendingAction === "save-edit" ? "Saving..." : "Save"}
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

      {activeUser && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (isPending) return;
            setActiveUserId(null);
            setShowDetailEditForm(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.35)",
            zIndex: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
        >
          <section
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(860px, 100%)", maxHeight: "90vh", overflow: "auto" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>User Details</h3>
              <span className="badge">{activeUser.role}</span>
            </div>
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table>
                <tbody>
                  <tr>
                    <th>Email</th>
                    <td>{activeUser.email}</td>
                  </tr>
                  <tr>
                    <th>Display Name</th>
                    <td>{activeUser.displayName ?? "-"}</td>
                  </tr>
                  <tr>
                    <th>Created</th>
                    <td>{new Date(activeUser.createdAt).toLocaleString("en-US")}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {showDetailEditForm && activeUser.role !== "ADMIN" ? (
              <div className="toolbar" style={{ display: "grid", marginTop: 10 }}>
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
              </div>
            ) : null}

            {activeUser.role === "ADMIN" && (
              <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>
                Admin account cannot be edited or deleted from this screen.
              </p>
            )}

            <div className="toolbar" style={{ marginTop: 12 }}>
              {showDetailEditForm && activeUser.role !== "ADMIN" ? (
                <>
                  <button className="button" type="button" disabled={isPending} onClick={saveDetailEdit}>
                    {isPending && pendingAction === "detail-save-edit" ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    disabled={isPending}
                    onClick={() => setShowDetailEditForm(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  className="button secondary"
                  type="button"
                  disabled={isPending || activeUser.role === "ADMIN"}
                  style={{ borderColor: "#93c5fd", color: "#1d4ed8", background: "#eff6ff" }}
                  onClick={startEditFromDetail}
                >
                  Edit User
                </button>
              )}
              <button
                className="button secondary"
                type="button"
                disabled={isPending}
                style={{ borderColor: "#d97706", color: "#b45309", background: "#fff7ed" }}
                onClick={deleteDetailDb}
              >
                {isPending && pendingAction === "detail-delete-db" ? "Deleting DB..." : "Delete DB"}
              </button>
              <button
                className="button"
                type="button"
                disabled={isPending || activeUser.role === "ADMIN"}
                style={{ background: "#b42318", borderColor: "#b42318", color: "#fff" }}
                onClick={deleteDetailUser}
              >
                {isPending && pendingAction === "detail-delete-user" ? "Deleting User..." : "Delete User"}
              </button>
            </div>
            <div className="toolbar" style={{ marginTop: 8, justifyContent: "flex-end" }}>
              <button
                className="button secondary"
                type="button"
                disabled={isPending}
                onClick={() => {
                  setActiveUserId(null);
                  setShowDetailEditForm(false);
                }}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      <section className="card">
        <h3 style={{ marginTop: 0 }}>User Accounts</h3>
        <div className="card user-actions-bar" style={{ padding: 10, marginBottom: 12 }}>
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
              className="button"
              type="button"
              disabled={isPending || selectedIds.length === 0}
              style={{ background: "#b42318", borderColor: "#b42318", color: "#fff" }}
              onClick={deleteSelectedUsers}
            >
              {isPending && pendingAction === "delete-users" ? "Deleting User..." : "Delete User"}
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
              {pagedUsers.map((user) => {
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
                    <td>
                      <button
                        className="text-link-btn"
                        type="button"
                        onClick={() => openUserDetail(user)}
                        title="Open user details"
                      >
                        {user.email}
                      </button>
                    </td>
                    <td>
                      <button
                        className="text-link-btn"
                        type="button"
                        onClick={() => openUserDetail(user)}
                        title="Open user details"
                      >
                        {user.displayName ?? "-"}
                      </button>
                    </td>
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
        {filteredUsers.length > 0 ? (
          <div
            className="toolbar"
            style={{
              marginTop: 12,
              justifyContent: "space-between",
              alignItems: "center",
              padding: 8,
              border: "1px solid #ded4c2",
              borderRadius: 10,
              background: "#f7f3ea"
            }}
          >
            <span className="muted">
              Showing {pageStart + 1}-{Math.min(filteredUsers.length, pageEnd)} / {filteredUsers.length}
            </span>
            {totalPages > 1 ? (
              <div className="toolbar" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="button secondary"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                  style={{ minWidth: 38, padding: "6px 10px" }}
                >
                  <ChevronLeftIcon aria-hidden="true" width={16} height={16} />
                </button>
                <span className="badge">{safePage}/{totalPages}</span>
                <button
                  type="button"
                  className="button secondary"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                  style={{ minWidth: 38, padding: "6px 10px" }}
                >
                  <ChevronRightIcon aria-hidden="true" width={16} height={16} />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {error && <div style={{ color: "#b42318", marginTop: 10 }}>{error}</div>}
      </section>
    </div>
  );
}
