"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { DashboardSummary } from "@/lib/types";

export function DashboardCharts({ summary }: { summary: DashboardSummary }) {
  const [isNarrow, setIsNarrow] = useState(false);
  const totalByCategory = summary.byCategory.reduce((sum, item) => sum + item.value, 0);

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0
    }).format(value);
  }

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1100px)");
    const apply = () => setIsNarrow(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return (
    <section className="dashboard-charts">
      <div className="card chart-card">
        <div className="chart-head">
          <h3>Daily Spending</h3>
          <span className="muted">Last activity trend</span>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={summary.dailySeries}>
            <CartesianGrid strokeDasharray="4 4" stroke="#ded4c2" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value: string) => new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(Number(value ?? 0)), "Amount"]}
              labelFormatter={(value: string) => new Date(value).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            />
            <Area
              type="monotone"
              dataKey="amount"
              fill="rgba(34, 90, 67, 0.18)"
              stroke="#225a43"
              strokeWidth={3}
              dot={{ r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        </div>
      </div>
      <div className="card chart-card chart-card-pie">
        <div className="chart-head">
          <h3>By Category</h3>
          <span className="muted">Spending share</span>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
            <Tooltip
              formatter={(value: number, name: string) => {
                const amount = Number(value ?? 0);
                const percent = totalByCategory > 0 ? (amount / totalByCategory) * 100 : 0;
                return [`${formatCurrency(amount)} (${percent.toFixed(2)}%)`, name || "Category"];
              }}
            />
            <Legend
              layout={isNarrow ? "horizontal" : "vertical"}
              align={isNarrow ? "center" : "right"}
              verticalAlign={isNarrow ? "bottom" : "middle"}
              wrapperStyle={isNarrow ? { paddingTop: 8 } : { right: 22 }}
            />
            <Pie
              data={summary.byCategory}
              dataKey="value"
              nameKey="name"
              cx={isNarrow ? "50%" : "42%"}
              cy={isNarrow ? "44%" : "50%"}
              outerRadius={isNarrow ? 108 : 132}
              innerRadius={0}
              paddingAngle={2}
              label={false}
              labelLine={false}
            >
              {summary.byCategory.map((entry, index) => (
                <Cell
                  key={`${entry.name}-${index}`}
                  fill={entry.color || "#d56f36"}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
