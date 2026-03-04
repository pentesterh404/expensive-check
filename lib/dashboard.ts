import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { DashboardSummary } from "@/lib/types";

export async function buildDashboardSummary(userId: string): Promise<DashboardSummary> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const baseWhere: Prisma.ExpenseWhereInput = {
    userId,
    deletedAt: null,
    status: { not: "DELETED" }
  };

  const [
    monthlyAgg,
    weeklyAgg,
    todayAgg,
    pendingCount,
    recentExpenses,
    chartExpenses
  ] = await Promise.all([
    prisma.expense.aggregate({
      where: {
        ...baseWhere,
        expenseDate: { gte: monthStart }
      },
      _sum: { amount: true }
    }),
    prisma.expense.aggregate({
      where: {
        ...baseWhere,
        expenseDate: { gte: weekStart }
      },
      _sum: { amount: true }
    }),
    prisma.expense.aggregate({
      where: {
        ...baseWhere,
        expenseDate: { gte: todayStart }
      },
      _sum: { amount: true }
    }),
    prisma.expense.count({
      where: {
        ...baseWhere,
        status: { in: ["PENDING_REVIEW", "UNPARSED"] }
      }
    }),
    prisma.expense.findMany({
      where: baseWhere,
      orderBy: { expenseDate: "desc" },
      take: 10,
      select: {
        id: true,
        description: true,
        rawText: true,
        amount: true,
        expenseDate: true,
        status: true,
        category: {
          select: { name: true }
        }
      }
    }),
    prisma.expense.findMany({
      where: {
        ...baseWhere,
        expenseDate: { gte: monthStart }
      },
      orderBy: { expenseDate: "desc" },
      take: 200,
      select: {
        amount: true,
        expenseDate: true,
        category: {
          select: { name: true, color: true }
        }
      }
    })
  ]);

  const monthlyTotal = Number(monthlyAgg._sum.amount ?? 0);
  const weeklyTotal = Number(weeklyAgg._sum.amount ?? 0);
  const todayTotal = Number(todayAgg._sum.amount ?? 0);

  const byCategoryMap = new Map<string, { value: number; color: string | null }>();
  for (const e of chartExpenses) {
    const key = e.category?.name ?? "Uncategorized";
    const current = byCategoryMap.get(key) ?? { value: 0, color: e.category?.color ?? null };
    byCategoryMap.set(key, {
      value: current.value + Number(e.amount),
      color: current.color ?? e.category?.color ?? null
    });
  }

  const dailyMap = new Map<string, number>();
  for (const e of chartExpenses) {
    const key = e.expenseDate.toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + Number(e.amount));
  }

  return {
    monthlyTotal,
    weeklyTotal,
    todayTotal,
    pendingCount,
    recentExpenses: recentExpenses.map((e) => ({
      id: e.id,
      description: e.description && e.description.trim().length > 0 ? e.description : "-",
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
