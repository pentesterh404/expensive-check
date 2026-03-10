"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function AdminDbTransferPanel() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingSql, setIsExportingSql] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const { showToast } = useToast();
  const busy = isExporting || isExportingSql || isImporting || isVerifyingToken;

  async function exportDb() {
    setIsExporting(true); setError(null); setMessage(null);
    try {
      const res = await fetch("/api/admin/db-export");
      if (!res.ok) { const d = await res.json().catch(() => ({})); const m = d.error || "Export failed"; setError(m); showToast(m, "error"); return; }
      const blob = await res.blob();
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json` });
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
      setMessage("JSON exported."); showToast("Database exported.", "success");
    } finally { setIsExporting(false); }
  }

  async function exportPgDump() {
    setIsExportingSql(true); setError(null); setMessage(null);
    try {
      const res = await fetch("/api/admin/db-export-pgdump");
      if (!res.ok) { const d = await res.json().catch(() => ({})); const m = d.error || "SQL export failed"; setError(m); showToast(m, "error"); return; }
      const blob = await res.blob();
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `pgdump-${new Date().toISOString().replace(/[:.]/g, "-")}.sql` });
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
      setMessage("SQL exported."); showToast("SQL export done.", "success");
    } finally { setIsExportingSql(false); }
  }

  async function verifyTelegramToken() {
    setIsVerifyingToken(true); setError(null); setMessage(null);
    try {
      const res = await fetch("/api/admin/telegram/verify-token", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.details?.telegram_description ? ` (${data.details.telegram_description})` : "";
        const m = `${data.error || "Token invalid"}${detail}`; setError(m); showToast(m, "error"); return;
      }
      const un = data?.bot?.username ? `@${data.bot.username}` : "unknown";
      const m = `Valid for bot ${un}.`; setMessage(m); showToast(m, "success");
    } finally { setIsVerifyingToken(false); }
  }

  function importDb() {
    if (!fileRef.current?.files?.[0]) { setError("Choose a backup file."); showToast("Choose a file.", "error"); return; }
    setShowImportConfirm(true);
  }

  async function executeImport() {
    const file = fileRef.current?.files?.[0]; if (!file) return;
    setShowImportConfirm(false); setIsImporting(true); setError(null); setMessage(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/admin/db-import", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { const m = data.error || "Import failed"; setError(m); showToast(m, "error"); return; }
      setMessage("Import completed."); showToast("Import done.", "success");
      if (fileRef.current) fileRef.current.value = "";
    } finally { setIsImporting(false); }
  }

  return (
    <div>
      <h4 style={{ margin: "0 0 4px", fontSize: "0.95rem", fontWeight: 600 }}>Database Operations</h4>
      <p className="muted" style={{ margin: "0 0 16px", fontSize: "0.8rem" }}>Export or import database backups</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button className="s-btn s-btn--ghost" disabled={busy} onClick={exportDb}>
          {isExporting ? "Exporting…" : "JSON Export"}
        </button>
        <button className="s-btn s-btn--ghost" disabled={busy} onClick={exportPgDump}>
          {isExportingSql ? "Running…" : "SQL Export"}
        </button>
        <button className="s-btn s-btn--ghost" disabled={busy} onClick={verifyTelegramToken}>
          {isVerifyingToken ? "Checking…" : "Verify Bot Token"}
        </button>
      </div>

      <div style={{ marginTop: 20, padding: "16px 20px", borderRadius: "var(--radius-md)", border: "1px dashed var(--line)", background: "var(--bg)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <input ref={fileRef} type="file" accept="application/json,.json" disabled={busy} style={{ fontSize: "0.8rem" }} />
        </div>
        <button className="s-btn s-btn--primary" disabled={busy} onClick={importDb}>
          {isImporting ? "Importing…" : "Import"}
        </button>
      </div>

      {(message || error) && <div className={`s-msg ${error ? "s-msg--err" : "s-msg--ok"}`} style={{ marginTop: 12 }}>{message || error}</div>}

      <ConfirmDialog
        isOpen={showImportConfirm}
        title="Import Database"
        message="This will replace ALL current data. This action is irreversible."
        confirmLabel="Import & Replace"
        isDestructive
        isLoading={isImporting}
        onConfirm={executeImport}
        onCancel={() => setShowImportConfirm(false)}
      />
    </div>
  );
}
