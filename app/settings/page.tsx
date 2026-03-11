import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { TelegramLinkPanel } from "@/components/TelegramLinkPanel";
import { AdminDbTransferPanel } from "@/components/AdminDbTransferPanel";
import { AdminRuntimeConfigPanel } from "@/components/AdminRuntimeConfigPanel";
import { AccountProfileForm } from "@/components/AccountProfileForm";
import { getSessionUser } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/auth/roles";
import { getRuntimeConfig } from "@/lib/server/runtime-config";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const isAdmin = isAdminEmail(user.email);
  const rc = getRuntimeConfig();
  const botUsername = rc.TELEGRAM_BOT_USERNAME || null;

  const envChecks = [
    { key: "DATABASE_URL", ok: !!process.env.DATABASE_URL, note: "Primary data storage" },
    { key: "JWT_SECRET", ok: !!process.env.JWT_SECRET, note: "Auth & sessions" },
    { key: "TELEGRAM_BOT_TOKEN", ok: !!rc.TELEGRAM_BOT_TOKEN, note: "Bot communication" },
    { key: "TELEGRAM_BOT_USERNAME", ok: !!rc.TELEGRAM_BOT_USERNAME, note: "Account linking" },
    { key: "TELEGRAM_WEBHOOK_SECRET", ok: !!process.env.TELEGRAM_WEBHOOK_SECRET, note: "Webhook security" },
    { key: "NEXT_PUBLIC_BASE_URL", ok: !!rc.NEXT_PUBLIC_BASE_URL, note: "Public endpoint" },
  ];
  const missing = envChecks.filter((e) => !e.ok).length;

  return (
    <AppShell showTopbar title="Settings" subtitle="Manage your account and integrations">
      <div className={isAdmin ? "settings-page settings-masonry" : "settings-page settings-grid"}>

        <AccountProfileForm user={user} />
        <TelegramLinkPanel botUsername={botUsername} isAdmin={isAdmin} />

        {isAdmin && (
          <>
            {/* Admin Console */}
            <section className="s-card">
              <div className="s-card-head">
                <h2 className="s-title" id="admin-console-title">Admin Console</h2>
                <p className="s-subtitle">Database tools and runtime configuration</p>
              </div>

              <Link
                href="/user-manager"
                className="s-banner"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, textDecoration: "none" }}
              >
                <div>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--primary)" }}>User Management →</span>
                  <span style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", marginTop: 2 }}>View and manage user accounts</span>
                </div>
              </Link>

              <AdminDbTransferPanel />
              <div style={{ margin: "28px 0", borderTop: "1px solid var(--line)" }} />
              <AdminRuntimeConfigPanel />
            </section>

            {/* System Health */}
            <section className="s-card">
              <div className="s-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 className="s-title">System Health</h2>
                  <p className="s-subtitle">Environment variable status</p>
                </div>
                <span className={`s-pill ${missing === 0 ? "s-pill--ok" : "s-pill--warn"}`}>
                  {missing === 0 ? "All Systems Go" : `${missing} Missing`}
                </span>
              </div>

              <div className="s-table-wrap">
                <table className="s-table mobile-stack-table">
                  <thead>
                    <tr>
                      <th>Variable</th>
                      <th>Status</th>
                      <th>Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {envChecks.map((v) => (
                      <tr key={v.key}>
                        <td data-label="Variable"><code>{v.key}</code></td>
                        <td data-label="Status">
                          <span className={`s-pill s-pill--sm ${v.ok ? "s-pill--ok" : "s-pill--err"}`}>
                            {v.ok ? "Active" : "Missing"}
                          </span>
                        </td>
                        <td data-label="Purpose" className="muted">{v.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
