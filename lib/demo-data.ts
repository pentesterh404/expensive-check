import type { DashboardSummary } from "@/lib/types";

export const demoSummary: DashboardSummary = {
  monthlyTotal: 4265000,
  weeklyTotal: 985000,
  todayTotal: 155000,
  pendingCount: 3,
  recentExpenses: [
    {
      id: "1",
      description: "Cafe meeting",
      amount: 45000,
      date: "2026-02-23T08:00:00.000Z",
      category: "Cafe",
      status: "CONFIRMED"
    },
    {
      id: "2",
      description: "Office lunch",
      amount: 65000,
      date: "2026-02-23T05:00:00.000Z",
      category: "Food",
      status: "CONFIRMED"
    },
    {
      id: "3",
      description: "Ride home",
      amount: 45000,
      date: "2026-02-22T12:30:00.000Z",
      category: "Transport",
      status: "PENDING_REVIEW"
    },
    {
      id: "4",
      description: "Unclear message",
      amount: 0,
      date: "2026-02-22T03:20:00.000Z",
      category: null,
      status: "UNPARSED"
    }
  ],
  byCategory: [
    { name: "Food", value: 1730000, color: "#d56f36" },
    { name: "Cafe", value: 420000, color: "#8f5c2c" },
    { name: "Transport", value: 710000, color: "#225a43" },
    { name: "Shopping", value: 1405000, color: "#a83f2f" }
  ],
  dailySeries: [
    { date: "2026-02-18", amount: 185000 },
    { date: "2026-02-19", amount: 245000 },
    { date: "2026-02-20", amount: 120000 },
    { date: "2026-02-21", amount: 235000 },
    { date: "2026-02-22", amount: 200000 },
    { date: "2026-02-23", amount: 155000 }
  ]
};

export const demoExpenses = [
  {
    id: "e1",
    expenseDate: "2026-02-23",
    description: "Cafe Highlands",
    amount: 45000,
    category: "cafe",
    tags: ["coffee"],
    wallet: "cash",
    status: "CONFIRMED"
  },
  {
    id: "e2",
    expenseDate: "2026-02-23",
    description: "Breakfast",
    amount: 35000,
    category: "food",
    tags: ["food"],
    wallet: "momo",
    status: "CONFIRMED"
  },
  {
    id: "e3",
    expenseDate: "2026-02-22",
    description: "Ride home",
    amount: 45000,
    category: "transport",
    tags: [],
    wallet: "card",
    status: "PENDING_REVIEW"
  },
  {
    id: "e4",
    expenseDate: "2026-02-22",
    description: "random note",
    amount: 0,
    category: null,
    tags: [],
    wallet: null,
    status: "UNPARSED"
  }
] as const;

export const demoCategories = [
  { id: "c1", name: "Food", slug: "food", color: "#d56f36", icon: "utensils" },
  { id: "c2", name: "Cafe", slug: "cafe", color: "#8f5c2c", icon: "coffee" },
  { id: "c3", name: "Transport", slug: "transport", color: "#225a43", icon: "car" },
  { id: "c4", name: "Shopping", slug: "shopping", color: "#a83f2f", icon: "bag" }
];
