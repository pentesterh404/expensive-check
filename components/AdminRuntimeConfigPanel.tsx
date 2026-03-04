"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";

type RuntimeConfig = {
  NEXT_PUBLIC_BASE_URL: string;
  TELEGRAM_BOT_USERNAME: string;
  TELEGRAM_BOT_TOKEN: string;
};

const EMPTY_CONFIG: RuntimeConfig = {
  NEXT_PUBLIC_BASE_URL: "",
  TELEGRAM_BOT_USERNAME: "",
  TELEGRAM_BOT_TOKEN: ""
};

export function AdminRuntimeConfigPanel() {
  const [config, setConfig] = useState<RuntimeConfig>(EMPTY_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    void loadConfig();
  }, []);

  async function loadConfig() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/runtime-config", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Failed to load runtime config", "error");
        return;
      }
      setConfig({
        NEXT_PUBLIC_BASE_URL: data.NEXT_PUBLIC_BASE_URL ?? "",
        TELEGRAM_BOT_USERNAME: data.TELEGRAM_BOT_USERNAME ?? "",
        TELEGRAM_BOT_TOKEN: data.TELEGRAM_BOT_TOKEN ?? ""
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveConfig() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/runtime-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Failed to save runtime config", "error");
        return;
      }
      setConfig({
        NEXT_PUBLIC_BASE_URL: data.NEXT_PUBLIC_BASE_URL ?? "",
        TELEGRAM_BOT_USERNAME: data.TELEGRAM_BOT_USERNAME ?? "",
        TELEGRAM_BOT_TOKEN: data.TELEGRAM_BOT_TOKEN ?? ""
      });
      showToast("Runtime config updated", "success");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h4 style={{ marginTop: 0, marginBottom: 8 }}>Runtime Config (Admin)</h4>
      <p className="muted" style={{ marginTop: 0 }}>
        Update Telegram and base URL settings directly from admin panel.
      </p>

      <div style={{ display: "grid", gap: 10 }}>
        <label>
          <div className="muted" style={{ marginBottom: 4 }}>NEXT_PUBLIC_BASE_URL</div>
          <input
            className="input"
            value={config.NEXT_PUBLIC_BASE_URL}
            onChange={(e) => setConfig((prev) => ({ ...prev, NEXT_PUBLIC_BASE_URL: e.target.value }))}
            placeholder="https://your-domain.com"
            disabled={isLoading || isSaving}
          />
        </label>

        <label>
          <div className="muted" style={{ marginBottom: 4 }}>TELEGRAM_BOT_USERNAME</div>
          <input
            className="input"
            value={config.TELEGRAM_BOT_USERNAME}
            onChange={(e) => setConfig((prev) => ({ ...prev, TELEGRAM_BOT_USERNAME: e.target.value }))}
            placeholder="your_bot_username"
            disabled={isLoading || isSaving}
          />
        </label>

        <label>
          <div className="muted" style={{ marginBottom: 4 }}>TELEGRAM_BOT_TOKEN</div>
          <input
            className="input"
            value={config.TELEGRAM_BOT_TOKEN}
            onChange={(e) => setConfig((prev) => ({ ...prev, TELEGRAM_BOT_TOKEN: e.target.value }))}
            placeholder="123456789:AA..."
            disabled={isLoading || isSaving}
          />
        </label>
      </div>

      <div className="toolbar" style={{ marginTop: 12 }}>
        <button className="button secondary" type="button" onClick={loadConfig} disabled={isLoading || isSaving}>
          {isLoading ? "Loading..." : "Reload"}
        </button>
        <button className="button" type="button" onClick={saveConfig} disabled={isLoading || isSaving}>
          {isSaving ? "Saving..." : "Save Config"}
        </button>
      </div>
    </div>
  );
}
