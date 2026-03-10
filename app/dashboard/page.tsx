import {
  BanknotesIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowRightIcon
} from "@heroicons/react/24/outline";
import { AppShell } from "@/components/AppShell";
import { DashboardCharts } from "@/components/DashboardCharts";
import { StatusBadge } from "@/components/StatusBadge";
import { getSessionUser } from "@/lib/auth/session";
import { buildDashboardSummary } from "@/lib/dashboard";
import { demoSummary } from "@/lib/demo-data";
import Link from "next/link";

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
    <AppShell
      showTopbar={true}
      title="Financial Insights"
      subtitle={`Welcome back, ${user ? (user.displayName || user.email.split('@')[0]) : "Guest"}`}
    >
      <div className="page">
        <section className="hero">
          <div>
            <h1 style={{ marginBottom: 4 }}>Welcome back, {user ? (user.displayName || user.email.split('@')[0]) : "Guest"}</h1>
            <p>Here's what's happening with your money this month.</p>
          </div>
        </section>

        <section className="dashboard-metrics">
          <div className="card metric-card">
            <div className="metric-label">Monthly Spending</div>
            <div className="metric-value">{formatCurrency(summary.monthlyTotal)}</div>
            <div className="metric-trend up">
              <span>+12%</span>
              <span style={{ color: "var(--muted)", fontWeight: 400 }}>vs last month</span>
            </div>
          </div>
          <div className="card metric-card">
            <div className="metric-label">Weekly Average</div>
            <div className="metric-value">{formatCurrency(summary.weeklyTotal)}</div>
            <div className="metric-trend down">
              <span>-5%</span>
              <span style={{ color: "var(--muted)", fontWeight: 400 }}>vs last week</span>
            </div>
          </div>
          <div className="card metric-card">
            <div className="metric-label">Today's Total</div>
            <div className="metric-value">{formatCurrency(summary.todayTotal)}</div>
            <div className="metric-trend" style={{ color: "var(--muted)" }}>
              <span>Steady</span>
            </div>
          </div>
          <div className="card metric-card">
            <div className="metric-label">Pending Review</div>
            <div className="metric-value" style={{ color: summary.pendingCount > 0 ? "var(--error)" : "var(--success)" }}>
              {summary.pendingCount}
            </div>
            <div className="metric-trend" style={{ color: "var(--muted)" }}>
              <span>Items to verify</span>
            </div>
          </div>
        </section>

        <DashboardCharts summary={summary} />

        <section className="card" style={{ overflow: "visible" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ margin: 0 }}>Recent Expenses</h3>
            <Link href="/expenses" className="text-link-btn" style={{ fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 6 }}>
              View All <ArrowRightIcon width={14} height={14} />
            </Link>
          </div>
          <div className="table-wrap">
            <table className="expense-table mobile-stack-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th className="th-right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentExpenses.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Date" className="muted" style={{ fontSize: "0.85rem" }}>
                      {new Date(item.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' })}
                    </td>
                    <td data-label="Description" style={{ fontWeight: 600, color: 'var(--ink)' }}>{item.description}</td>
                    <td data-label="Category">
                      <span className="badge" style={{ background: "var(--primary-light)", color: "var(--primary)", border: "0", fontWeight: 600, fontSize: '0.75rem' }}>
                        {item.category ?? "Uncategorized"}
                      </span>
                    </td>
                    <td data-label="Amount" className="td-right" style={{ fontWeight: 700, color: "var(--ink)" }}>
                      {formatCurrency(item.amount)}
                    </td>
                    <td data-label="Status">
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
