import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { TelegramLinkPanel } from "@/components/TelegramLinkPanel";
import { UserMenu } from "@/components/UserMenu";
import { getSessionUser } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/auth/roles";

export default async function SettingsPage() {
  const user = await getSessionUser();
  const isAdmin = isAdminEmail(user?.email);
  const envChecks = [
    {
      key: "DATABASE_URL",
      present: Boolean(process.env.DATABASE_URL),
      note: "Required for Prisma/Postgres access"
    },
    {
      key: "JWT_SECRET",
      present: Boolean(process.env.JWT_SECRET),
      note: "Required for login/session validation"
    },
    {
      key: "TELEGRAM_BOT_TOKEN",
      present: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      note: "Required for bot replies and Telegram API calls"
    },
    {
      key: "TELEGRAM_WEBHOOK_SECRET",
      present: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
      note: "Required for webhook endpoint validation"
    },
    {
      key: "NEXT_PUBLIC_BASE_URL",
      present: Boolean(process.env.NEXT_PUBLIC_BASE_URL),
      note: "Used for setup/docs and public app base URL"
    }
  ];
  const missingCount = envChecks.filter((e) => !e.present).length;

  return (
    <AppShell showTopbar={false}>
      <div className="page">
        <section className="hero">
          <div className="hero-head">
            <div>
              <h1>Settings</h1>
              <p>
                {isAdmin
                  ? "Configure Telegram linking and admin environment shortcuts."
                  : "Configure Telegram linking for your expense tracker."}
              </p>
            </div>
            <UserMenu user={user} />
          </div>
        </section>

        <section className={`grid ${isAdmin ? "cols-2" : "cols-1"}`}>
          <TelegramLinkPanel />
          {isAdmin ? (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Environment Variables</h3>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
                <li><code>DATABASE_URL</code> for Supabase/Postgres</li>
                <li><code>JWT_SECRET</code> for custom auth</li>
                <li><code>TELEGRAM_BOT_TOKEN</code> (server only)</li>
                <li><code>TELEGRAM_WEBHOOK_SECRET</code> for webhook endpoint</li>
                <li><code>NEXT_PUBLIC_BASE_URL</code> for webhook setup/base URL</li>
              </ul>
              <div className="toolbar" style={{ marginTop: 12 }}>
                <Link href="/user-manager" className="button secondary">
                  Open User Manager
                </Link>
              </div>

              <div className="card" style={{ marginTop: 14 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8
                  }}
                >
                  <h4 style={{ margin: 0 }}>Environment Health</h4>
                  <span
                    className="badge"
                    style={{
                      borderColor: missingCount === 0 ? "#86efac" : "#fdba74",
                      color: missingCount === 0 ? "#166534" : "#9a3412",
                      background: missingCount === 0 ? "#f0fdf4" : "#fff7ed"
                    }}
                  >
                    {missingCount === 0 ? "All Required Variables Present" : `${missingCount} Missing`}
                  </span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Variable</th>
                        <th>Status</th>
                        <th>Impact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {envChecks.map((item) => (
                        <tr key={item.key}>
                          <td><code>{item.key}</code></td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                borderColor: item.present ? "#86efac" : "#fca5a5",
                                color: item.present ? "#166534" : "#991b1b",
                                background: item.present ? "#f0fdf4" : "#fef2f2"
                              }}
                            >
                              {item.present ? "Present" : "Missing"}
                            </span>
                          </td>
                          <td className="muted">{item.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="muted" style={{ marginBottom: 0, marginTop: 8 }}>
                  This panel checks presence only and never reveals secret values.
                </p>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
