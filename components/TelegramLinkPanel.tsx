"use client";

import { useState } from "react";

export function TelegramLinkPanel() {
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateLinkCode() {
    setError(null);
    const res = await fetch("/api/telegram/link", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Failed to create link code");
      return;
    }
    setLinkCode(data.code);
    setExpiresAt(data.expires_at);
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Telegram Linking</h3>
      <p className="muted">
        Generate a code, then send <code>/link CODE</code> to your Telegram bot.
      </p>
      <div className="toolbar">
        <button className="button" type="button" onClick={generateLinkCode}>
          Generate Link Code
        </button>
      </div>
      {linkCode && (
        <div className="card" style={{ marginTop: 12 }}>
          <div>
            <strong>Code:</strong> <code>{linkCode}</code>
          </div>
          <div className="muted">
            Expires at: {expiresAt ? new Date(expiresAt).toLocaleString("en-US") : "-"}
          </div>
        </div>
      )}
      {error && <div style={{ color: "#b42318", marginTop: 8 }}>{error}</div>}
    </div>
  );
}
