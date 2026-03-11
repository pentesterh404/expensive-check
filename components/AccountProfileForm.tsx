"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ToastProvider";

type AccountUser = { id: string; email: string; displayName: string | null };

export function AccountProfileForm({ user }: { user: AccountUser }) {
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  return (
    <section className="s-card">
      <div className="s-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 className="s-title">Profile Settings</h2>
          <p className="s-subtitle">Manage your public identity and security</p>
        </div>
        <span className="s-pill s-pill--primary">{user.email}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="s-field">
          <label className="s-label">Email Address</label>
          <input className="s-input" value={user.email} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
        </div>
        <div className="s-field">
          <label className="s-label">Display Name</label>
          <input className="s-input" value={displayName} placeholder="How others see you" onChange={(e) => setDisplayName(e.target.value)} />
        </div>
      </div>

      <div className="s-field" style={{ marginTop: 20 }}>
        <label className="s-label">New Password</label>
        <input className="s-input" type="password" value={password} placeholder="Leave blank to keep current" onChange={(e) => setPassword(e.target.value)} />
        <span className="s-hint">Use at least 8 characters with a mix of letters and numbers.</span>
      </div>

      <div className="s-actions">
        <button
          className="s-btn s-btn--primary"
          disabled={isPending}
          onClick={() => {
            setError(null);
            setMessage(null);
            startTransition(async () => {
              const res = await fetch("/api/account", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ displayName: displayName || null, ...(password ? { password } : {}) }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                const msg = data.error || "Failed to update profile";
                setError(msg);
                showToast(msg, "error");
                return;
              }
              setPassword("");
              setMessage("Profile updated successfully.");
              showToast("Profile updated.", "success");
            });
          }}
        >
          {isPending ? "Updating…" : "Update Profile"}
        </button>
        <button
          className="s-btn s-btn--ghost"
          disabled={isPending || (!password && !error)}
          onClick={() => { setPassword(""); setError(null); }}
        >
          Reset
        </button>
      </div>

      {(message || error) && (
        <div className={`s-msg ${error ? "s-msg--err" : "s-msg--ok"}`}>
          {message || error}
        </div>
      )}
    </section>
  );
}
