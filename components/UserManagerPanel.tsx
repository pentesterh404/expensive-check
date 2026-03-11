"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/components/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";

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

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [dbDeleteResult, setDbDeleteResult] = useState<{
    target: string;
    result: Record<string, number>;
  } | null>(null);
  const [confirmData, setConfirmData] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { }
  });
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
    setConfirmData({
      isOpen: true,
      title: "Delete DB Contents",
      message: `Are you sure you want to delete DB contents for ${selectedIds.length} selected user(s)? This action is irreversible.`,
      onConfirm: () => {
        setConfirmData(prev => ({ ...prev, isOpen: false }));
        void deleteUserDbByIds(
          selectedIds,
          `${selectedIds.length} selected user(s)`,
          "delete-selected-db"
        );
      }
    });
  }

  function deleteAdminDb() {
    const admin = users.find((u) => u.id === currentAdminId);
    if (!admin) return;
    setConfirmData({
      isOpen: true,
      title: "Delete Admin DB",
      message: `Are you sure you want to delete DB contents for admin account ${admin.email}?`,
      onConfirm: () => {
        setConfirmData(prev => ({ ...prev, isOpen: false }));
        void deleteUserDbByIds([admin.id], admin.email, "delete-admin-db");
      }
    });
  }

  function deleteSelectedUsers() {
    if (selectedIds.length === 0) return;
    setConfirmData({
      isOpen: true,
      title: "Delete User Accounts",
      message: `Are you sure you want to delete ${selectedIds.length} selected user account(s) and all related data? This cannot be undone.`,
      onConfirm: () => {
        setConfirmData(prev => ({ ...prev, isOpen: false }));
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
    setConfirmData({
      isOpen: true,
      title: "Delete User account",
      message: `Delete user ${activeUser.email} and all related data? This action is permanent.`,
      onConfirm: () => {
        setConfirmData(prev => ({ ...prev, isOpen: false }));
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
    });
  }

  function deleteDetailDb() {
    if (!activeUser) return;
    setConfirmData({
      isOpen: true,
      title: "Delete DB Contents",
      message: `Are you sure you want to delete all database entries for ${activeUser.email}?`,
      onConfirm: () => {
        setConfirmData(prev => ({ ...prev, isOpen: false }));
        void deleteUserDbByIds([activeUser.id], activeUser.email, "detail-delete-db");
      }
    });
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

      {mounted && activeUser && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => { if (isPending) return; setActiveUserId(null); setShowDetailEditForm(false); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 100%)",
              background: "var(--panel-solid)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--line)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              animation: "modalIn 0.2s ease-out",
            }}
          >
            {/* Header */}
            <div style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))", padding: "28px 32px", color: "white" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>User Identification</h3>
              <p style={{ margin: "4px 0 0", opacity: 0.8, fontSize: "0.9rem" }}>Detailed account profile and system role</p>
            </div>

            <div style={{ padding: 32, display: "grid", gap: 20 }}>
              <div style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.05em" }}>Display Name</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>{activeUser.displayName || "Not set"}</div>
              </div>

              <div style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.05em" }}>Email Address</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>{activeUser.email}</div>
              </div>

              <div className="grid cols-2" style={{ gap: 24 }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.05em" }}>System Role</span>
                  <div>
                    <span className={`badge ${activeUser.role === "ADMIN" ? "danger" : "info"}`} style={{ fontWeight: 700 }}>
                      {activeUser.role}
                    </span>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.05em" }}>Created On</span>
                  <div style={{ fontWeight: 600 }}>{new Date(activeUser.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.05em" }}>Internal Database ID</span>
                <code style={{ fontSize: "0.85rem", background: "rgba(0,0,0,0.05)", padding: "6px 10px", borderRadius: 6, display: "block", wordBreak: "break-all" }}>
                  {activeUser.id}
                </code>
              </div>

              {showDetailEditForm && activeUser.role !== "ADMIN" && (
                <div className="card" style={{ marginTop: 8, padding: 16, border: "1px solid var(--accent-light)", background: "var(--primary-light)" }}>
                  <h4 style={{ marginTop: 0, fontSize: "0.9rem", fontWeight: 700, color: "var(--accent-dark)", marginBottom: 12 }}>Quick Edit Profile</h4>
                  <div className="toolbar" style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)" }}>Email</span>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                    <div style={{ display: "grid", gap: 4 }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)" }}>Name</span>
                      <input
                        value={editForm.displayName}
                        onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                      />
                    </div>
                    <div style={{ display: "grid", gap: 4 }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)" }}>Reset Password</span>
                      <input
                        type="password"
                        placeholder="Leave blank to skip"
                        value={editForm.password}
                        onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "18px 32px", background: "var(--bg)", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {!showDetailEditForm && activeUser.role !== "ADMIN" && (
                  <button className="s-btn s-btn--ghost" onClick={startEditFromDetail}>
                    Edit Profile
                  </button>
                )}
                {showDetailEditForm && (
                  <button className="s-btn s-btn--primary" onClick={saveDetailEdit} disabled={isPending}>
                    {isPending && pendingAction === "detail-save-edit" ? "Saving…" : "Save Changes"}
                  </button>
                )}
                <button
                  className="s-btn s-btn--danger-ghost"
                  onClick={deleteDetailUser}
                  disabled={isPending || activeUser.role === "ADMIN"}
                >
                  Delete User
                </button>
              </div>
              <button className="s-btn s-btn--ghost" onClick={() => { setActiveUserId(null); setShowDetailEditForm(false); }}>
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <section className="card">
        <h3 style={{ marginTop: 0 }}>User Accounts</h3>
        <div className="toolbar" style={{ marginBottom: 20, background: "rgba(0,0,0,0.02)", padding: 12, borderRadius: 12, border: "1px solid var(--line)", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 280px" }}>
            <input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36, width: "100%" }}
            />
            <svg
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
          </div>

          <div className="toolbar" style={{ gap: 8, flex: "1 1 auto", justifyContent: "flex-end" }}>
            <span className="badge" style={{ background: "white", color: "var(-- ink)" }}>{selectedIds.length} Selected</span>
            <button
              className="button"
              type="button"
              disabled={isPending}
              style={{ padding: "8px 16px" }}
              onClick={() => {
                resetMessages();
                setShowCreateForm((v) => !v);
                setShowEditForm(false);
              }}
            >
              Create
            </button>
            <button
              className="button danger"
              type="button"
              disabled={isPending || selectedIds.length === 0}
              onClick={deleteSelectedUsers}
            >
              {isPending && pendingAction === "delete-users" ? "..." : "Delete"}
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="mobile-stack-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>Sel</th>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map((user) => {
                const isUserAdmin = user.role === "ADMIN";
                return (
                  <tr key={user.id} style={{ transition: "background 0.2s ease" }}>
                    <td data-label="Select">
                      {!isUserAdmin ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(user.id)}
                          onChange={() => toggleSelected(user.id)}
                          aria-label={`Select ${user.email}`}
                          style={{ cursor: "pointer" }}
                        />
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                    <td data-label="Email">
                      <button
                        className="text-link-btn"
                        type="button"
                        onClick={() => openUserDetail(user)}
                        title="Open user details"
                        style={{ fontWeight: 600, color: "var(--primary)" }}
                      >
                        {user.email}
                      </button>
                    </td>
                    <td data-label="Name" style={{ fontWeight: 500 }}>{user.displayName ?? "-"}</td>
                    <td data-label="Role">
                      <span className={`badge ${isUserAdmin ? "danger" : "info"}`} style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td data-label="Created" className="muted" style={{ fontSize: "0.85rem" }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
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
              marginTop: 20,
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              border: "1px solid var(--line)",
              borderRadius: 12,
              background: "rgba(0,0,0,0.02)"
            }}
          >
            <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 500 }}>
              Showing <span style={{ color: "var(--ink)" }}>{pageStart + 1}-{Math.min(filteredUsers.length, pageEnd)}</span> of <span style={{ color: "var(--ink)" }}>{filteredUsers.length}</span> users
            </span>
            {totalPages > 1 ? (
              <div className="toolbar" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="button secondary"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                  style={{ minWidth: 36, padding: "6px", height: 36, borderRadius: "50%", background: "white" }}
                >
                  <ChevronLeftIcon aria-hidden="true" width={18} height={18} />
                </button>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--ink)" }}>
                  <span style={{ color: "var(--primary)" }}>{safePage}</span>
                  <span style={{ margin: "0 4px", color: "var(--muted)", fontWeight: 400 }}>/</span>
                  <span>{totalPages}</span>
                </div>
                <button
                  type="button"
                  className="button secondary"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                  style={{ minWidth: 36, padding: "6px", height: 36, borderRadius: "50%", background: "white" }}
                >
                  <ChevronRightIcon aria-hidden="true" width={18} height={18} />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {error && <div style={{ color: "#b42318", marginTop: 10 }}>{error}</div>}
      </section>
      <ConfirmDialog
        isOpen={confirmData.isOpen}
        title={confirmData.title}
        message={confirmData.message}
        onConfirm={confirmData.onConfirm}
        onCancel={() => setConfirmData((prev) => ({ ...prev, isOpen: false }))}
        isDestructive={true}
        isLoading={isPending}
      />
    </div>
  );
}
