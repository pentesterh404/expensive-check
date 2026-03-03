import { AppShell } from "@/components/AppShell";
import { CompareMonthsChart } from "@/components/CompareMonthsChart";
import { UserMenu } from "@/components/UserMenu";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

type MonthCompareRow = {
  name: string;
  color: string | null;
  leftTotal: number;
  rightTotal: number;
};

function monthInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthParam(value: string | undefined, fallback: Date) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return monthInputValue(fallback);
  return value;
}

function monthRange(value: string) {
  const [year, month] = value.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(value);
}

export default async function ComparePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const user = await getSessionUser();

  const leftMonth = parseMonthParam(typeof sp.left === "string" ? sp.left : undefined, prev);
  const rightMonth = parseMonthParam(typeof sp.right === "string" ? sp.right : undefined, now);
  const leftRange = monthRange(leftMonth);
  const rightRange = monthRange(rightMonth);

  const expenses = user
    ? await prisma.expense.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          status: { not: "DELETED" },
          OR: [
            { expenseDate: { gte: leftRange.start, lt: leftRange.end } },
            { expenseDate: { gte: rightRange.start, lt: rightRange.end } }
          ]
        },
        select: {
          amount: true,
          expenseDate: true,
          category: {
            select: { name: true, color: true }
          }
        }
      })
    : [];

  const leftKey = `${leftRange.start.getFullYear()}-${leftRange.start.getMonth()}`;
  const rightKey = `${rightRange.start.getFullYear()}-${rightRange.start.getMonth()}`;

  const rowsMap = new Map<string, MonthCompareRow>();
  let leftTotal = 0;
  let rightTotal = 0;

  for (const item of expenses) {
    const monthKey = `${item.expenseDate.getFullYear()}-${item.expenseDate.getMonth()}`;
    const categoryName = item.category?.name ?? "Uncategorized";
    const current = rowsMap.get(categoryName) ?? {
      name: categoryName,
      color: item.category?.color ?? null,
      leftTotal: 0,
      rightTotal: 0
    };
    const amount = Number(item.amount);
    if (monthKey === leftKey) {
      current.leftTotal += amount;
      leftTotal += amount;
    } else if (monthKey === rightKey) {
      current.rightTotal += amount;
      rightTotal += amount;
    }
    rowsMap.set(categoryName, current);
  }

  const rows = [...rowsMap.values()].sort(
    (a, b) => Math.max(b.leftTotal, b.rightTotal) - Math.max(a.leftTotal, a.rightTotal)
  );
  const delta = rightTotal - leftTotal;
  const deltaPct = leftTotal > 0 ? (delta / leftTotal) * 100 : rightTotal > 0 ? 100 : 0;
  const leftLabel = monthLabel(leftMonth);
  const rightLabel = monthLabel(rightMonth);
  const chartData = rows.map((row) => ({
    category: row.name,
    leftTotal: row.leftTotal,
    rightTotal: row.rightTotal
  }));

  return (
    <AppShell showTopbar={false}>
      <div className="page">
        <section className="hero">
          <div className="hero-head">
            <div>
              <h1>Compare Months</h1>
              <p>Compare total spending and category changes between two months.</p>
            </div>
            <UserMenu user={user} />
          </div>
        </section>

        <section className="card">
          <form className="compare-form" method="GET">
            <label>
              Left Month
              <input type="month" name="left" defaultValue={leftMonth} />
            </label>
            <label>
              Right Month
              <input type="month" name="right" defaultValue={rightMonth} />
            </label>
            <button type="submit" className="button">Apply</button>
          </form>
        </section>

        <section className="compare-metrics">
          <div className="card metric-card">
            <div className="metric-label">{leftLabel}</div>
            <div className="metric-value">{formatCurrency(leftTotal)}</div>
          </div>
          <div className="card metric-card">
            <div className="metric-label">{rightLabel}</div>
            <div className="metric-value">{formatCurrency(rightTotal)}</div>
          </div>
          <div className="card metric-card metric-card-review">
            <div className="metric-label">Delta</div>
            <div className="metric-value">{delta >= 0 ? "+" : "-"}{formatCurrency(Math.abs(delta))}</div>
            <div className={`compare-delta ${delta >= 0 ? "up" : "down"}`}>
              {deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(2)}%
            </div>
          </div>
        </section>

        <section className="card compare-chart-card">
          <div className="chart-head">
            <h3>Category Comparison</h3>
            <span className="muted">Grouped vertical bars by category</span>
          </div>
          {rows.length === 0 ? (
            <p className="muted">No expenses in selected months.</p>
          ) : (
            <CompareMonthsChart data={chartData} leftLabel={leftLabel} rightLabel={rightLabel} />
          )}
        </section>

        <section className="card">
          <h3 style={{ marginTop: 0 }}>Top Category Changes</h3>
          {rows.length === 0 ? (
            <p className="muted">No expenses in selected months.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>{leftLabel}</th>
                    <th>{rightLabel}</th>
                    <th>Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const diff = row.rightTotal - row.leftTotal;
                    return (
                      <tr key={row.name}>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <span className="compare-dot" style={{ background: row.color ?? "#d56f36" }} />
                            {row.name}
                          </span>
                        </td>
                        <td>{formatCurrency(row.leftTotal)}</td>
                        <td>{formatCurrency(row.rightTotal)}</td>
                        <td className={diff >= 0 ? "compare-up" : "compare-down"}>
                          {diff >= 0 ? "+" : "-"}{formatCurrency(Math.abs(diff))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
