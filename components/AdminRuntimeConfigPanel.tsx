"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";

type RuntimeConfig = {
  NEXT_PUBLIC_BASE_URL: string;
  TELEGRAM_BOT_USERNAME: string;
  TELEGRAM_BOT_TOKEN: string;
};

const EMPTY: RuntimeConfig = { NEXT_PUBLIC_BASE_URL: "", TELEGRAM_BOT_USERNAME: "", TELEGRAM_BOT_TOKEN: "" };

export function AdminRuntimeConfigPanel() {
  const [config, setConfig] = useState<RuntimeConfig>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();
  const busy = isLoading || isSaving;

  useEffect(() => { void load(); }, []);

  async function load() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/runtime-config", { cache: "no-store" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(d.error || "Load failed", "error"); return; }
      setConfig({ NEXT_PUBLIC_BASE_URL: d.NEXT_PUBLIC_BASE_URL ?? "", TELEGRAM_BOT_USERNAME: d.TELEGRAM_BOT_USERNAME ?? "", TELEGRAM_BOT_TOKEN: d.TELEGRAM_BOT_TOKEN ?? "" });
    } finally { setIsLoading(false); }
  }

  async function save() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/runtime-config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(d.error || "Save failed", "error"); return; }
      setConfig({ NEXT_PUBLIC_BASE_URL: d.NEXT_PUBLIC_BASE_URL ?? "", TELEGRAM_BOT_USERNAME: d.TELEGRAM_BOT_USERNAME ?? "", TELEGRAM_BOT_TOKEN: d.TELEGRAM_BOT_TOKEN ?? "" });
      showToast("Config saved", "success");
    } finally { setIsSaving(false); }
  }

  const fields: { label: string; key: keyof RuntimeConfig; placeholder: string; secret?: boolean }[] = [
    { label: "BASE URL", key: "NEXT_PUBLIC_BASE_URL", placeholder: "https://your-domain.com" },
    { label: "BOT USERNAME", key: "TELEGRAM_BOT_USERNAME", placeholder: "your_bot" },
    { label: "BOT TOKEN", key: "TELEGRAM_BOT_TOKEN", placeholder: "123456789:AA…", secret: true },
  ];

  return (
    <div>
      <h4 style={{ margin: "0 0 4px", fontSize: "0.95rem", fontWeight: 600 }}>Runtime Config</h4>
      <p className="muted" style={{ margin: "0 0 16px", fontSize: "0.8rem" }}>Override Telegram and URL settings</p>

      <div style={{ display: "grid", gap: 16 }}>
        {fields.map((f) => (
          <div className="s-field" key={f.key}>
            <label className="s-label">{f.label}</label>
            <input
              className="s-input"
              type={f.secret ? "password" : "text"}
              value={config[f.key]}
              onChange={(e) => setConfig((p) => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              disabled={busy}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
        <button className="s-btn s-btn--primary" onClick={save} disabled={busy}>
          {isSaving ? "Saving…" : "Save Config"}
        </button>
        <button className="s-btn s-btn--ghost" onClick={load} disabled={busy}>
          {isLoading ? "Loading…" : "Reload"}
        </button>
      </div>
    </div>
  );
}
