export type ExpenseStatus = "CONFIRMED" | "PENDING_REVIEW" | "UNPARSED" | "DELETED";

export interface DashboardSummary {
  monthlyTotal: number;
  weeklyTotal: number;
  todayTotal: number;
  pendingCount: number;
  recentExpenses: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    category: string | null;
    status: ExpenseStatus;
  }>;
  byCategory: Array<{ name: string; value: number; color?: string | null }>;
  dailySeries: Array<{ date: string; amount: number }>;
}
