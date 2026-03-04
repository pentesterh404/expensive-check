"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";

export function AdminDbTransferPanel() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingSql, setIsExportingSql] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  async function exportDb() {
    setIsExporting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/db-export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || "Failed to export DB";
        setError(msg);
        showToast(msg, "error");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expense-tracker-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMessage("Database exported successfully.");
      showToast("Database exported successfully.", "success");
    } finally {
      setIsExporting(false);
    }
  }

  async function verifyTelegramToken() {
    setIsVerifyingToken(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/telegram/verify-token", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.details?.telegram_description
          ? ` (${data.details.telegram_description})`
          : "";
        const msg = `${data.error || "Telegram token invalid"}${detail}`;
        setError(msg);
        showToast(msg, "error");
        return;
      }

      const username = data?.bot?.username ? `@${data.bot.username}` : "unknown";
      const msg = `Telegram token is valid for bot ${username}.`;
      setMessage(msg);
      showToast(msg, "success");
    } finally {
      setIsVerifyingToken(false);
    }
  }

  async function exportPgDump() {
    setIsExportingSql(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/db-export-pgdump");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || "Failed to export SQL with pg_dump";
        setError(msg);
        showToast(msg, "error");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expense-tracker-pgdump-${new Date().toISOString().replace(/[:.]/g, "-")}.sql`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMessage("SQL backup exported successfully.");
      showToast("SQL backup exported successfully.", "success");
    } finally {
      setIsExportingSql(false);
    }
  }

  async function importDb() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Please choose a backup file.");
      showToast("Please choose a backup file.", "error");
      return;
    }

    if (!window.confirm("Import will replace the current database. Continue?")) {
      return;
    }

    setIsImporting(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/admin/db-import", {
        method: "POST",
        body: form
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || "Failed to import DB";
        setError(msg);
        showToast(msg, "error");
        return;
      }
      setMessage("Database import completed.");
      showToast("Database import completed.", "success");
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h4 style={{ marginTop: 0, marginBottom: 8 }}>Database Backup</h4>
      <p className="muted" style={{ marginTop: 0 }}>
        Admin only. Export full database to JSON, or import a JSON backup to restore data.
      </p>
      <div className="toolbar">
        <button
          className="button secondary"
          type="button"
          disabled={isExporting || isExportingSql || isImporting || isVerifyingToken}
          onClick={exportDb}
        >
          {isExporting ? "Exporting..." : "Export DB"}
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={isExporting || isExportingSql || isImporting || isVerifyingToken}
          onClick={exportPgDump}
        >
          {isExportingSql ? "Exporting SQL..." : "Export SQL (pg_dump)"}
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={isExporting || isExportingSql || isImporting || isVerifyingToken}
          onClick={verifyTelegramToken}
        >
          {isVerifyingToken ? "Verifying Token..." : "Verify Telegram Token"}
        </button>
      </div>
      <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
        `Export SQL (pg_dump)` requires `pg_dump` binary on the server runtime.
      </p>

      <div className="toolbar" style={{ marginTop: 10, alignItems: "center" }}>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          disabled={isImporting || isExporting || isExportingSql || isVerifyingToken}
        />
        <button
          className="button"
          type="button"
          disabled={isImporting || isExporting || isExportingSql || isVerifyingToken}
          onClick={importDb}
        >
          {isImporting ? "Importing..." : "Import DB"}
        </button>
      </div>

      {message && <div style={{ color: "#166534", marginTop: 10 }}>{message}</div>}
      {error && <div style={{ color: "#b42318", marginTop: 10 }}>{error}</div>}
    </div>
  );
}
