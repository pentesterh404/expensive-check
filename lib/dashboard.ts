import { prisma } from "@/lib/db";
import type { DashboardSummary } from "@/lib/types";

export async function buildDashboardSummary(userId: string): Promise<DashboardSummary> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      deletedAt: null,
      status: { not: "DELETED" },
      expenseDate: { gte: monthStart }
    },
    orderBy: { expenseDate: "desc" },
    include: { category: true },
    take: 200
  });

  const monthlyTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const weeklyTotal = expenses
    .filter((e) => e.expenseDate >= weekStart)
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const todayTotal = expenses
    .filter((e) => e.expenseDate >= todayStart)
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const pendingCount = expenses.filter((e) =>
    e.status === "PENDING_REVIEW" || e.status === "UNPARSED"
  ).length;

  const byCategoryMap = new Map<string, { value: number; color: string | null }>();
  for (const e of expenses) {
    const key = e.category?.name ?? "Uncategorized";
    const current = byCategoryMap.get(key) ?? { value: 0, color: e.category?.color ?? null };
    byCategoryMap.set(key, {
      value: current.value + Number(e.amount),
      color: current.color ?? e.category?.color ?? null
    });
  }

  const dailyMap = new Map<string, number>();
  for (const e of expenses) {
    const key = e.expenseDate.toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + Number(e.amount));
  }

  return {
    monthlyTotal,
    weeklyTotal,
    todayTotal,
    pendingCount,
    recentExpenses: expenses.slice(0, 10).map((e) => ({
      id: e.id,
      description: e.description ?? e.rawText ?? "No description",
      amount: Number(e.amount),
      date: e.expenseDate.toISOString(),
      category: e.category?.name ?? null,
      status: e.status
    })),
    byCategory: [...byCategoryMap.entries()].map(([name, meta]) => ({
      name,
      value: meta.value,
      color: meta.color
    })),
    dailySeries: [...dailyMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({ date, amount }))
  };
}
