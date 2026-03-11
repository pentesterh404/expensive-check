"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type TelegramLinkStatus = {
  linked: boolean;
  telegram_user_id: string | null;
  telegram_chat_id: string | null;
  username: string | null;
  linked_at: string | null;
  debug_enabled?: boolean;
};

export function TelegramLinkPanel({
  botUsername,
  isAdmin = false,
}: {
  botUsername?: string | null;
  isAdmin?: boolean;
}) {
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [status, setStatus] = useState<TelegramLinkStatus | null>(null);
  const [debug, setDebug] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const { showToast } = useToast();

  function withDebug(url: string) {
    if (!isAdmin) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}debug=${debug}`;
  }

  async function refreshLinkStatus(opts?: { silent?: boolean }) {
    setIsChecking(true);
    try {
      const res = await fetch(withDebug("/api/telegram/link"), { method: "GET", cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as TelegramLinkStatus & { error?: string };
      if (!res.ok) {
        if (!opts?.silent) showToast(data.error || "Failed to fetch link status", "error");
        return;
      }
      setStatus({
        linked: !!data.linked,
        telegram_user_id: data.telegram_user_id ?? null,
        telegram_chat_id: data.telegram_chat_id ?? null,
        username: data.username ?? null,
        linked_at: data.linked_at ?? null,
        debug_enabled: data.debug_enabled ?? false,
      });
    } finally {
      setIsChecking(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    try {
      const s = window.localStorage.getItem("debug_mode");
      if (s === "true" || s === "false") setDebug(s === "true");
    } catch { }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    try { window.localStorage.setItem("debug_mode", String(debug)); } catch { }
  }, [debug, isAdmin]);

  useEffect(() => { void refreshLinkStatus({ silent: true }); }, [debug]);

  useEffect(() => {
    if (!linkCode || status?.linked) return;
    const t = setInterval(() => void refreshLinkStatus({ silent: true }), 5000);
    return () => clearInterval(t);
  }, [linkCode, status?.linked]);

  async function generateLinkCode() {
    setIsGenerating(true);
    setError(null);
    setCopyState("idle");
    try {
      const res = await fetch(withDebug("/api/telegram/link"), { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { const m = data.error || "Failed to create link code"; setError(m); showToast(m, "error"); return; }
      setLinkCode(data.code);
      setExpiresAt(data.expires_at);
      showToast("Link code generated", "success");
      setTimeout(() => void refreshLinkStatus({ silent: true }), 1000);
    } finally {
      setIsGenerating(false);
    }
  }

  async function executeUnlink() {
    setShowUnlinkConfirm(false);
    setIsUnlinking(true);
    try {
      const res = await fetch(withDebug("/api/telegram/link"), { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(data.error || "Failed to unlink", "error"); return; }
      showToast("Telegram unlinked", "success");
      setLinkCode(null);
      setExpiresAt(null);
      await refreshLinkStatus({ silent: true });
    } finally {
      setIsUnlinking(false);
    }
  }

  async function copyLinkCommand() {
    if (!linkCode) return;
    try {
      await navigator.clipboard.writeText(`/link ${linkCode}`);
      setCopyState("copied");
      showToast("Copied /link command", "success", 1500);
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setCopyState("failed");
      showToast("Copy failed", "error", 1500);
      setTimeout(() => setCopyState("idle"), 1500);
    }
  }

  const bot = botUsername?.replace(/^@/, "") ?? "";
  const botUrl = bot ? `https://t.me/${bot}` : null;
  const directUrl = bot && linkCode ? `https://t.me/${bot}?text=${encodeURIComponent(`/link ${linkCode}`)}` : null;

  return (
    <section className="s-card">
      {/* Header */}
      <div className="s-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 className="s-title">Telegram Integration</h2>
          <p className="s-subtitle">Receive instant expense alerts on your phone</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: status?.linked ? "var(--success)" : "var(--muted)",
            boxShadow: status?.linked ? "0 0 0 3px rgba(16,185,129,0.2)" : "none",
          }} />
          <span style={{
            fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
            color: status?.linked ? "var(--success)" : "var(--muted)",
          }}>
            {status?.linked ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Body */}
      {status?.linked ? (
        <div style={{ display: "grid", gap: 24 }}>
          {/* Linked info */}
          <div className="s-highlight-box">
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: "0.95rem" }}>Linked Account</strong>
              <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.85rem" }}>
                {status.username ? `@${status.username}` : `ID: ${status.telegram_user_id}`}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="s-btn s-btn--ghost" onClick={() => refreshLinkStatus()} disabled={isChecking}>
                {isChecking ? "…" : "Refresh"}
              </button>
              <button className="s-btn s-btn--danger-ghost" onClick={() => setShowUnlinkConfirm(true)} disabled={isUnlinking}>
                {isUnlinking ? "…" : "Unlink"}
              </button>
            </div>
          </div>

          {/* Commands */}
          <div>
            <h4 style={{ margin: "0 0 12px", fontSize: "0.85rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Available Commands
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { cmd: "/start", desc: "Initialize" },
                { cmd: "/status", desc: "Check link" },
                { cmd: "/help", desc: "All commands" },
                { cmd: "/unlink", desc: "Disconnect" },
              ].map((c) => (
                <div key={c.cmd} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)", background: "var(--bg)" }}>
                  <code style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.85rem" }}>{c.cmd}</code>
                  <span className="muted" style={{ fontSize: "0.8rem" }}>{c.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 28 }}>
          {/* Steps + Code generator side by side */}
          <div className="settings-row" style={{ gap: 32, alignItems: "start" }}>
            {/* Steps */}
            <div style={{ display: "grid", gap: 20 }}>
              {[
                { n: 1, t: "Open Telegram", d: <span>Search for <a href={botUrl ?? "#"} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", fontWeight: 600 }}>@{bot || "bot"}</a> or tap the link</span> },
                { n: 2, t: "Generate Code", d: <span>Click the button to get a unique verification code</span> },
                { n: 3, t: "Send to Bot", d: <span>Message the code to complete integration</span> },
              ].map((s) => (
                <div key={s.n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>
                    {s.n}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{s.t}</div>
                    <div className="muted" style={{ fontSize: "0.8rem", marginTop: 2 }}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Code area */}
            <div style={{ padding: 28, textAlign: "center", borderRadius: "var(--radius-lg)", border: "2px dashed var(--line)", background: "var(--bg)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
              {!linkCode ? (
                <>
                  <button className="s-btn s-btn--primary s-btn--lg" onClick={generateLinkCode} disabled={isGenerating}>
                    {isGenerating ? "Generating…" : "Generate Link Code"}
                  </button>
                  <p className="muted" style={{ marginTop: 10, fontSize: "0.8rem" }}>Expires in 2 minutes</p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Verification Code</div>
                  <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--primary)", fontFamily: "monospace", letterSpacing: "0.15em", margin: "4px 0 16px" }}>{linkCode}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="s-btn s-btn--ghost" onClick={copyLinkCommand}>
                      {copyState === "copied" ? "Copied!" : "Copy Command"}
                    </button>
                    {directUrl && (
                      <a className="s-btn s-btn--primary" href={directUrl} target="_blank" rel="noreferrer">
                        Open in Telegram
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Refresh hint */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--bg)", border: "1px solid var(--line)" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              Already sent the code?{" "}
              <button onClick={() => refreshLinkStatus()} disabled={isChecking} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 600, cursor: "pointer", padding: 0, fontSize: "inherit" }}>
                Refresh status
              </button>
            </span>
          </div>
        </div>
      )}

      {/* Admin debug */}
      {isAdmin && (
        <div style={{ marginTop: 28, padding: "16px 20px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)", background: "var(--bg)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Developer Console</span>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.85rem" }}>
              <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
              <span style={{ fontWeight: 600 }}>Debug</span>
            </label>
          </div>
          <div className="muted" style={{ fontSize: "0.8rem", marginTop: 6 }}>
            Status: <code>{status?.debug_enabled ? "Enabled" : "Default"}</code> · Bot: <code>{bot ? `@${bot}` : "Unset"}</code>
          </div>
        </div>
      )}

      {error && <div className="s-msg s-msg--err" style={{ marginTop: 16 }}>{error}</div>}

      <ConfirmDialog
        isOpen={showUnlinkConfirm}
        title="Disconnect Telegram"
        message="Are you sure? You will stop receiving notifications and bot-based expense parsing."
        confirmLabel="Disconnect"
        isDestructive
        isLoading={isUnlinking}
        onConfirm={executeUnlink}
        onCancel={() => setShowUnlinkConfirm(false)}
      />
    </section>
  );
}
