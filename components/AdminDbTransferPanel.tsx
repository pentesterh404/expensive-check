"use client";

import { useRef, useState } from "react";

export function AdminDbTransferPanel() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function exportDb() {
    setIsExporting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/db-export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to export DB");
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
    } finally {
      setIsExporting(false);
    }
  }

  async function importDb() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Please choose a backup file.");
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
        setError(data.error || "Failed to import DB");
        return;
      }
      setMessage("Database import completed.");
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
        <button className="button secondary" type="button" disabled={isExporting || isImporting} onClick={exportDb}>
          {isExporting ? "Exporting..." : "Export DB"}
        </button>
      </div>

      <div className="toolbar" style={{ marginTop: 10, alignItems: "center" }}>
        <input ref={fileRef} type="file" accept="application/json,.json" disabled={isImporting || isExporting} />
        <button className="button" type="button" disabled={isImporting || isExporting} onClick={importDb}>
          {isImporting ? "Importing..." : "Import DB"}
        </button>
      </div>

      {message && <div style={{ color: "#166534", marginTop: 10 }}>{message}</div>}
      {error && <div style={{ color: "#b42318", marginTop: 10 }}>{error}</div>}
    </div>
  );
}

