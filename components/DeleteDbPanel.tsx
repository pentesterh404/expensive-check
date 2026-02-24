"use client";

import { useState, useTransition } from "react";

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
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetLabel, setTargetLabel] = useState<string | null>(null);

  function deleteForUser(user: AdminUserRow) {
    if (!window.confirm(`Delete DB contents for ${user.email} (keep account)?`)) return;
    setError(null);
    setTargetLabel(user.email);
    startTransition(async () => {
      const res = await fetch("/api/deletedb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setResult(data.result ?? null);
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
            {users.map((user) => (
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
      {error && <div style={{ color: "#b42318", marginTop: 8 }}>{error}</div>}
      {result && (
        <pre className="card" style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
{JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
