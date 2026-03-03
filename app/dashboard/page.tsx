import { AppShell } from "@/components/AppShell";
import { DashboardCharts } from "@/components/DashboardCharts";
import { StatusBadge } from "@/components/StatusBadge";
import { UserMenu } from "@/components/UserMenu";
import { getSessionUser } from "@/lib/auth/session";
import { buildDashboardSummary } from "@/lib/dashboard";
import { demoSummary } from "@/lib/demo-data";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(value);
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  const summary = user ? await buildDashboardSummary(user.id) : demoSummary;

  return (
    <AppShell showTopbar={false}>
      <div className="page">
        <section className="hero">
          <div className="hero-head">
            <div>
              <h1>Dashboard</h1>
              <p>Overview of spending trends, category distribution, and review queue.</p>
            </div>
            <UserMenu user={user} />
          </div>
        </section>

        <section className="dashboard-metrics">
          <div className="card metric-card">
            <div className="metric-label">This Month</div>
            <div className="metric-value">{formatCurrency(summary.monthlyTotal)}</div>
          </div>
          <div className="card metric-card">
            <div className="metric-label">Last 7 Days</div>
            <div className="metric-value">{formatCurrency(summary.weeklyTotal)}</div>
          </div>
          <div className="card metric-card">
            <div className="metric-label">Today</div>
            <div className="metric-value">{formatCurrency(summary.todayTotal)}</div>
          </div>
          <div className="card metric-card metric-card-review">
            <div className="metric-label">Review Queue</div>
            <div className="metric-value">{summary.pendingCount}</div>
          </div>
        </section>

        <DashboardCharts summary={summary} />

        <section className="card">
          <h3 style={{ marginTop: 0 }}>Recent Expenses</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentExpenses.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.date).toLocaleDateString("en-US")}</td>
                    <td>{item.description}</td>
                    <td>{item.category ?? "-"}</td>
                    <td>{formatCurrency(item.amount)}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
