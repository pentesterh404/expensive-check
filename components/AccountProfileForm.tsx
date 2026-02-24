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
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Account Profile</h3>
      <div className="toolbar" style={{ display: "grid" }}>
        <input value={user.email} disabled />
        <input
          value={displayName}
          placeholder="Display name"
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <input
          type="password"
          value={password}
          placeholder="New password (optional, min 8 chars)"
          onChange={(e) => setPassword(e.target.value)}
        />
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
        {message && <div style={{ color: "#225a43" }}>{message}</div>}
        {error && <div style={{ color: "#b42318" }}>{error}</div>}
      </div>
    </div>
  );
}
