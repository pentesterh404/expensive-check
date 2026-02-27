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
  const sp = (await searchParams) ?? {};
  const q = typeof sp.q === "string" ? sp.q : "";
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";
  const category = typeof sp.category === "string" ? sp.category : "";
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
            { description: { contains: q, mode: "insensitive" } },
            { rawText: { contains: q, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const dbExpenses = user
    ? await prisma.expense.findMany({
        where: { userId: user.id, ...baseWhere },
        include: {
          category: true,
          telegramMessage: {
            select: { createdAt: true }
          }
        },
        orderBy: { expenseDate: "desc" },
        take: 200
      })
    : [];

  const categoryOptions = user
    ? await prisma.category.findMany({
        where: { userId: user.id },
        select: { id: true, slug: true, name: true },
        orderBy: { name: "asc" }
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
        status: e.status,
        parseConfidence: e.parseConfidence
      }))
    : demoExpenses;

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
        />
      </div>
    </AppShell>
  );
}
