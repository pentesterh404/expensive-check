"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";

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
  isAdmin = false
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
  const { showToast } = useToast();

  function withDebug(url: string) {
    if (!isAdmin) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}debug=${debug ? "true" : "false"}`;
  }

  async function refreshLinkStatus(options?: { silent?: boolean }) {
    setIsChecking(true);
    try {
      const res = await fetch(withDebug("/api/telegram/link"), { method: "GET", cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as TelegramLinkStatus & { error?: string };
      if (!res.ok) {
        if (!options?.silent) {
          showToast(data.error || "Failed to fetch link status", "error");
        }
        return;
      }
      setStatus({
        linked: Boolean(data.linked),
        telegram_user_id: data.telegram_user_id ?? null,
        telegram_chat_id: data.telegram_chat_id ?? null,
        username: data.username ?? null,
        linked_at: data.linked_at ?? null,
        debug_enabled: data.debug_enabled ?? false
      });
    } finally {
      setIsChecking(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    try {
      const saved = window.localStorage.getItem("debug_mode");
      if (saved === "true" || saved === "false") {
        setDebug(saved === "true");
      }
    } catch {}
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    try {
      window.localStorage.setItem("debug_mode", String(debug));
    } catch {}
  }, [debug, isAdmin]);

  useEffect(() => {
    void refreshLinkStatus({ silent: true });
  }, [debug]);

  useEffect(() => {
    if (!linkCode || status?.linked) return;
    const timer = setInterval(() => {
      void refreshLinkStatus({ silent: true });
    }, 5000);
    return () => clearInterval(timer);
  }, [linkCode, status?.linked]);

  async function generateLinkCode() {
    setIsGenerating(true);
    setError(null);
    setCopyState("idle");
    try {
      const res = await fetch(withDebug("/api/telegram/link"), { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || "Failed to create link code";
        setError(msg);
        showToast(msg, "error");
        return;
      }
      setLinkCode(data.code);
      setExpiresAt(data.expires_at);
      showToast("Link code generated", "success");
      setTimeout(() => {
        void refreshLinkStatus({ silent: true });
      }, 1000);
    } finally {
      setIsGenerating(false);
    }
  }

  async function unlinkTelegram() {
    if (!status?.linked) return;
    const confirmed = window.confirm("Unlink Telegram account from this user?");
    if (!confirmed) return;
    setIsUnlinking(true);
    try {
      const res = await fetch(withDebug("/api/telegram/link"), { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || "Failed to unlink Telegram account";
        showToast(msg, "error");
        return;
      }
      showToast("Telegram account unlinked", "success");
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

  const normalizedBotUsername = botUsername?.replace(/^@/, "") ?? "";
  const botChatUrl = normalizedBotUsername ? `https://t.me/${normalizedBotUsername}` : null;
  const directCommandUrl =
    normalizedBotUsername && linkCode
      ? `https://t.me/${normalizedBotUsername}?text=${encodeURIComponent(`/link ${linkCode}`)}`
      : null;

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
            {directCommandUrl ? (
              <a className="button secondary" href={directCommandUrl} target="_blank" rel="noreferrer">
                Send To Telegram
              </a>
            ) : botChatUrl ? (
              <a className="button secondary" href={botChatUrl} target="_blank" rel="noreferrer">
                Open Telegram Bot
              </a>
            ) : null}
          </div>
          <div className="muted">
            Expires at: {expiresAt ? new Date(expiresAt).toLocaleString("en-US") : "-"}
          </div>
          {!botChatUrl ? (
            <div className="muted" style={{ marginTop: 6 }}>
              Configure <code>TELEGRAM_BOT_USERNAME</code> in <code>.env</code> to enable direct Telegram link.
            </div>
          ) : null}
        </div>
      )}
      <div className="toolbar" style={{ marginTop: 8 }}>
        <button className="button secondary" type="button" disabled={isChecking} onClick={() => refreshLinkStatus()}>
          {isChecking ? "Checking..." : "Check Link Status"}
        </button>
        <button
          className="button danger"
          type="button"
          disabled={!status?.linked || isUnlinking}
          onClick={unlinkTelegram}
        >
          {isUnlinking ? "Unlinking..." : "Unlink Telegram"}
        </button>
      </div>

      {isAdmin ? (
        <div className="card" style={{ marginTop: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
            <strong>Debug mode</strong>
            <code>{`debug=${debug ? "true" : "false"}`}</code>
          </label>
          <div className="muted" style={{ marginTop: 8 }}>
            Toggle debug logs/response for Telegram APIs. Also supports env <code>DEBUG=true|false</code>.
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 12 }}>
        <div>
          <strong>Status:</strong>{" "}
          <span
            className="badge"
            style={{
              borderColor: status?.linked ? "#86efac" : "#fca5a5",
              color: status?.linked ? "#166534" : "#991b1b",
              background: status?.linked ? "#f0fdf4" : "#fef2f2"
            }}
          >
            {status?.linked ? "Linked" : "Not linked"}
          </span>
        </div>
        {isAdmin ? (
          <div className="muted" style={{ marginTop: 6 }}>
            Effective debug: <code>{String(status?.debug_enabled ?? debug)}</code>
          </div>
        ) : null}
        {status?.linked ? (
          <div className="muted" style={{ marginTop: 8 }}>
            Telegram: {status.username ? `@${status.username}` : "No username"} | User ID:{" "}
            {status.telegram_user_id ?? "-"} | Linked at:{" "}
            {status.linked_at ? new Date(status.linked_at).toLocaleString("en-US") : "-"}
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 8 }}>
            Account Telegram chua lien ket voi bot.
          </div>
        )}
      </div>

      {error && <div style={{ color: "#b42318", marginTop: 8 }}>{error}</div>}
    </div>
  );
}
