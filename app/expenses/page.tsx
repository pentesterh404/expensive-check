import type { Prisma } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { ExpensesTable } from "@/components/ExpensesTable";
import { ExpensesToolbar } from "@/components/ExpensesToolbar";
import { demoExpenses } from "@/lib/demo-data";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export default async function ExpensesPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  type CategoryOption = { id: string; slug: string; name: string };
  type MonthOption = { value: string; label: string };
  const PAGE_SIZE = 10;
  const sp = (await searchParams) ?? {};
  const q = typeof sp.q === "string" ? sp.q : "";
  const month = typeof sp.month === "string" ? sp.month : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const rawPage = typeof sp.page === "string" ? Number.parseInt(sp.page, 10) : 1;
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const user = await getSessionUser();
  const status = typeof sp.status === "string" ? sp.status : "";
  const showReviewQueueBulkActions = Boolean(user) && status === "REVIEW_QUEUE";
  const monthRows = user
    ? await prisma.$queryRaw<{ month_start: Date }[]>`
        SELECT date_trunc('month', "expenseDate") AS month_start
        FROM "Expense"
        WHERE "userId" = ${user.id}
          AND "deletedAt" IS NULL
          AND status <> 'DELETED'
        GROUP BY 1
        ORDER BY 1 DESC
      `
    : [];
  const monthOptions: MonthOption[] =
    monthRows.length > 0
      ? monthRows.map((row) => {
        const date = new Date(row.month_start);
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        return { value, label };
      })
      : [];
  const selectedMonth = monthOptions.some((option) => option.value === month)
    ? month
    : (monthOptions[0]?.value ?? "");
  const selectedMonthRange = (() => {
    if (!selectedMonth) return null;
    const [year, monthValue] = selectedMonth.split("-").map(Number);
    const start = new Date(year, monthValue - 1, 1);
    const end = new Date(year, monthValue, 1);
    return { start, end };
  })();

  const baseWhere: Prisma.ExpenseWhereInput = {
    deletedAt: null,
    status: { not: "DELETED" },
    ...(selectedMonthRange
      ? {
        expenseDate: {
          gte: selectedMonthRange.start,
          lt: selectedMonthRange.end
        }
      }
      : {}),
    ...(category ? { category: { slug: category } } : {}),
    ...(status === "REVIEW_QUEUE"
      ? { status: { in: ["PENDING_REVIEW", "UNPARSED"] } }
      : status
        ? { status: status as any }
        : {}),
    ...(q
      ? {
        id: { contains: q, mode: "insensitive" }
      }
      : {})
  };

  const [totalCount, categoryOptions]: [number, CategoryOption[]] = user
    ? await Promise.all([
      prisma.expense.count({
        where: { userId: user.id, ...baseWhere }
      }),
      prisma.category.findMany({
        where: { userId: user.id },
        select: { id: true, slug: true, name: true },
        orderBy: { name: "asc" }
      })
    ])
    : [demoExpenses.length, []];
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const dbExpenses = user
    ? await prisma.expense.findMany({
      where: { userId: user.id, ...baseWhere },
      select: {
        id: true,
        expenseDate: true,
        createdAt: true,
        description: true,
        rawText: true,
        amount: true,
        tags: true,
        wallet: true,
        status: true,
        category: {
          select: { name: true, slug: true }
        },
        telegramMessage: {
          select: { createdAt: true }
        }
      },
      orderBy: { expenseDate: "desc" },
      skip: offset,
      take: PAGE_SIZE
    })
    : [];

  const rows = user
    ? dbExpenses.map((e) => ({
      id: e.id,
      expenseDate: e.expenseDate.toISOString().slice(0, 10),
      receivedAt: (e.telegramMessage?.createdAt ?? e.createdAt).toISOString(),
      description: e.description ?? "",
      amount: Number(e.amount),
      category: e.category?.name ?? null,
      categorySlug: e.category?.slug ?? null,
      tags: e.tags,
      wallet: e.wallet,
      status: e.status
    }))
    : demoExpenses.slice(offset, offset + PAGE_SIZE);

  return (
    <AppShell
      showTopbar={true}
      title="Expenses Management"
      subtitle="Track and categorize your spending"
    >
      <div className="page" style={{ gap: 20 }}>
        <section className="card" style={{ padding: '16px 20px' }}>
          <ExpensesToolbar
            categories={categoryOptions}
            monthOptions={monthOptions}
            selectedMonth={selectedMonth}
            rows={rows as any}
          />
        </section>

        <ExpensesTable
          rows={rows as any}
          categories={categoryOptions}
          showBulkActions={showReviewQueueBulkActions}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
        />
      </div>
    </AppShell>
  );
}
