"use client";

import { useState, useTransition } from "react";

type AccountUser = {
  id: string;
  email: string;
  displayName: string | null;
};

export function AccountProfileForm({ user }: { user: AccountUser }) {
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card account-card">
      <div className="account-card-head">
        <div>
          <h3 style={{ margin: 0 }}>Account Details</h3>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Update your profile and security settings.
          </p>
        </div>
        <span className="badge">{user.email}</span>
      </div>

      <div className="account-form-grid">
        <label className="account-field">
          <span>Email</span>
          <input value={user.email} disabled />
        </label>
        <label className="account-field">
          <span>Display Name</span>
          <input
            value={displayName}
            placeholder="Display name"
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
        <label className="account-field">
          <span>New Password (optional)</span>
          <input
            type="password"
            value={password}
            placeholder="Enter new password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
      </div>

      <div className="account-actions">
        <button
          className="button"
          type="button"
          disabled={isPending}
          onClick={() => {
            setError(null);
            setMessage(null);
            startTransition(async () => {
              const res = await fetch("/api/account", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  displayName: displayName || null,
                  ...(password ? { password } : {})
                })
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                setError(data.error || "Failed to update profile");
                return;
              }
              setPassword("");
              setMessage("Profile updated.");
            });
          }}
        >
          {isPending ? "Saving..." : "Save Profile"}
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={isPending}
          onClick={() => {
            setPassword("");
            setError(null);
          }}
        >
          Clear Password
        </button>
      </div>

      <div className="account-status">
        {message && <div className="account-ok">{message}</div>}
        {error && <div className="account-err">{error}</div>}
      </div>
    </div>
  );
}
