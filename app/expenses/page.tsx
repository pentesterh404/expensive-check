import type { Prisma } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { ExpensesTable } from "@/components/ExpensesTable";
import { ExpensesToolbar } from "@/components/ExpensesToolbar";
import { UserMenu } from "@/components/UserMenu";
import { demoExpenses } from "@/lib/demo-data";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export default async function ExpensesPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  type CategoryOption = { id: string; slug: string; name: string };
  const PAGE_SIZE = 10;
  const sp = (await searchParams) ?? {};
  const q = typeof sp.q === "string" ? sp.q : "";
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const rawPage = typeof sp.page === "string" ? Number.parseInt(sp.page, 10) : 1;
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const user = await getSessionUser();
  const status = typeof sp.status === "string" ? sp.status : "";
  const showReviewQueueBulkActions = Boolean(user) && status === "REVIEW_QUEUE";

  const baseWhere: Prisma.ExpenseWhereInput = {
    deletedAt: null,
    status: { not: "DELETED" },
    ...(from || to
      ? {
          expenseDate: {
            ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59`) } : {})
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
          OR: [
            { id: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { rawText: { contains: q, mode: "insensitive" } }
          ]
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
        description: e.description ?? e.rawText ?? "",
        amount: Number(e.amount),
        category: e.category?.name ?? null,
        categorySlug: e.category?.slug ?? null,
        tags: e.tags,
        wallet: e.wallet,
        status: e.status
      }))
    : demoExpenses.slice(offset, offset + PAGE_SIZE);

  return (
    <AppShell showTopbar={false}>
      <div className="page">
        <section className="hero">
          <div className="hero-head">
            <div>
              <h1>Expenses</h1>
              <p>Filter by date, category, text, and status. Review Queue supports bulk confirm/delete.</p>
            </div>
            <UserMenu user={user} />
          </div>
        </section>

        <section className="card">
          <ExpensesToolbar categories={categoryOptions} />
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
