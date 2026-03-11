import { AppShell } from "@/components/AppShell";
import { CompareMonthsChart } from "@/components/CompareMonthsChart";
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

function buildMonthOptionsFromStart(start: Date, end: Date) {
  const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  const options: { value: string; label: string }[] = [];
  let cursor = new Date(endMonth);
  while (cursor >= startMonth) {
    const value = monthInputValue(cursor);
    options.push({ value, label: monthLabel(value) });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  }
  return options;
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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const user = await getSessionUser();

  const requestedLeftMonth = parseMonthParam(typeof sp.left === "string" ? sp.left : undefined, prev);
  const requestedRightMonth = parseMonthParam(typeof sp.right === "string" ? sp.right : undefined, now);

  const earliestExpense = user
    ? await prisma.expense.findFirst({
      where: {
        userId: user.id,
        deletedAt: null,
        status: { not: "DELETED" }
      },
      orderBy: { expenseDate: "asc" },
      select: { expenseDate: true }
    })
    : null;

  const fallbackStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const monthOptions = buildMonthOptionsFromStart(earliestExpense?.expenseDate ?? fallbackStart, now);
  const optionValueSet = new Set(monthOptions.map((option) => option.value));

  const rightMonth = optionValueSet.has(requestedRightMonth)
    ? requestedRightMonth
    : (monthOptions[0]?.value ?? monthInputValue(now));

  const leftMonthDefault = monthOptions[1]?.value ?? monthOptions[0]?.value ?? monthInputValue(prev);
  const leftMonth = optionValueSet.has(requestedLeftMonth) ? requestedLeftMonth : leftMonthDefault;

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
  const swapHref = `/compare?left=${encodeURIComponent(rightMonth)}&right=${encodeURIComponent(leftMonth)}`;

  const rowsMap = new Map<string, MonthCompareRow>();
  let leftTotal = 0;
  let rightTotal = 0;
  let leftCount = 0;
  let rightCount = 0;

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
      leftCount += 1;
    } else if (monthKey === rightKey) {
      current.rightTotal += amount;
      rightTotal += amount;
      rightCount += 1;
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
    <AppShell
      showTopbar={true}
      title="Trend Analysis"
      subtitle="Compare spending across time periods"
    >
      <div className="page" style={{ gap: 20 }}>
        <section className="card">
          <form className="compare-form" method="GET">
            <label>
              Left Month
              <select name="left" defaultValue={leftMonth}>
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Right Month
              <select name="right" defaultValue={rightMonth}>
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="compare-form-actions">
              <a href={swapHref} className="button secondary" aria-label="Swap two months">
                Swap
              </a>
              <button type="submit" className="button">Apply</button>
            </div>
          </form>
        </section>

        <section className="compare-metrics">
          <div className="card metric-card">
            <div className="metric-label">{leftLabel}</div>
            <div className="metric-value">{formatCurrency(leftTotal)}</div>
            <div className="muted">{leftCount} expense{leftCount === 1 ? "" : "s"}</div>
          </div>
          <div className="card metric-card">
            <div className="metric-label">{rightLabel}</div>
            <div className="metric-value">{formatCurrency(rightTotal)}</div>
            <div className="muted">{rightCount} expense{rightCount === 1 ? "" : "s"}</div>
          </div>
          <div className="card metric-card metric-card-review">
            <div className="metric-label">Delta</div>
            <div className="metric-value">{delta >= 0 ? "+" : "-"}{formatCurrency(Math.abs(delta))}</div>
            <div className={`compare-delta ${delta >= 0 ? "up" : "down"}`}>
              {deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(2)}%
            </div>
          </div>
        </section>

        <section className={`card chart-card compare-chart-card ${rows.length === 0 ? "compare-chart-card-empty" : ""}`}>
          <div className="chart-head">
            <h3>Category Comparison</h3>
            <span className="muted">Grouped vertical bars by category</span>
          </div>
          {rows.length === 0 ? (
            <div className="compare-empty-state">
              <p className="muted" style={{ margin: 0 }}>
                No expenses found in selected months.
              </p>
              <p className="muted" style={{ margin: 0 }}>
                Try another month range or add expenses in Telegram first.
              </p>
            </div>
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
              <table className="mobile-stack-table">
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
                        <td data-label="Category">
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <span className="compare-dot" style={{ background: row.color ?? "#d56f36" }} />
                            {row.name}
                          </span>
                        </td>
                        <td data-label={leftLabel}>{formatCurrency(row.leftTotal)}</td>
                        <td data-label={rightLabel}>{formatCurrency(row.rightTotal)}</td>
                        <td data-label="Delta" className={diff >= 0 ? "compare-up" : "compare-down"}>
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
