"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/components/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type AdminUserRow = {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
};

export function DeleteDbPanel({
  users,
  currentAdminId
}: {
  users: AdminUserRow[];
  currentAdminId: string;
}) {
  const PAGE_SIZE = 20;
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetLabel, setTargetLabel] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { showToast } = useToast();
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pagedUsers = users.slice(pageStart, pageEnd);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);

  function deleteForUser(user: AdminUserRow) {
    setSelectedUser(user);
    setShowConfirm(true);
  }

  function executeDelete() {
    if (!selectedUser) return;
    setShowConfirm(false);
    setError(null);
    setTargetLabel(selectedUser.email);
    startTransition(async () => {
      const res = await fetch("/api/deletedb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || "Failed";
        setError(msg);
        showToast(msg, "error");
        return;
      }
      setResult(data.result ?? null);
      showToast(`Deleted DB data for ${selectedUser?.email}`, "success");
    });
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Admin Delete DB (Keep Accounts)</h3>
      <p className="muted">
        Select a user and delete that user's data (expenses, categories, Telegram links/messages,
        audit logs). The account record is preserved.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Created</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pagedUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.displayName ?? "-"}</td>
                <td>{user.email}</td>
                <td>{new Date(user.createdAt).toLocaleString("en-US")}</td>
                <td>{user.id === currentAdminId ? "Admin (you)" : "User"}</td>
                <td>
                  <button
                    type="button"
                    className="button"
                    style={{ background: "#b42318", borderColor: "#b42318" }}
                    disabled={isPending}
                    onClick={() => deleteForUser(user)}
                  >
                    {isPending && targetLabel === user.email ? "Deleting..." : "Delete DB"}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {users.length > 0 ? (
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
            Showing {pageStart + 1}-{Math.min(users.length, pageEnd)} / {users.length}
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
      {error && <div style={{ color: "#b42318", marginTop: 8 }}>{error}</div>}
      {result && (
        <pre className="card" style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
      <ConfirmDialog
        isOpen={showConfirm}
        title="Delete User Database"
        message={`Are you sure you want to delete all database entries for ${selectedUser?.email}? The account itself will be preserved.`}
        confirmLabel="Delete Everything"
        isDestructive={true}
        isLoading={isPending}
        onConfirm={executeDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
