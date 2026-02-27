"use client";

import { useState } from "react";

export function TelegramLinkPanel() {
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function generateLinkCode() {
    setIsGenerating(true);
    setError(null);
    setCopyState("idle");
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to create link code");
        return;
      }
      setLinkCode(data.code);
      setExpiresAt(data.expires_at);
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyLinkCommand() {
    if (!linkCode) return;
    try {
      await navigator.clipboard.writeText(`/link ${linkCode}`);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setCopyState("failed");
      setTimeout(() => setCopyState("idle"), 1500);
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Telegram Linking</h3>
      <p className="muted">
        Generate a code, then send <code>/link CODE</code> to your Telegram bot. The code expires in 2 minutes.
      </p>
      <div className="toolbar">
        <button className="button" type="button" disabled={isGenerating} onClick={generateLinkCode}>
          {isGenerating ? "Generating..." : "Generate Link Code"}
        </button>
      </div>
      {linkCode && (
        <div className="card" style={{ marginTop: 12 }}>
          <div>
            <strong>Code:</strong> <code>{linkCode}</code>
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Command:</strong> <code>/link {linkCode}</code>
          </div>
          <div className="toolbar" style={{ marginTop: 8 }}>
            <button className="button secondary" type="button" onClick={copyLinkCommand}>
              {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy /link command"}
            </button>
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
