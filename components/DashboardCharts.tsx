"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { DashboardSummary } from "@/lib/types";

export function DashboardCharts({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="grid cols-2">
      <div className="card" style={{ height: 320 }}>
        <h3 style={{ marginTop: 0 }}>Daily Spending</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={summary.dailySeries}>
            <CartesianGrid strokeDasharray="4 4" stroke="#ded4c2" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#225a43"
              strokeWidth={3}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="card" style={{ height: 320 }}>
        <h3 style={{ marginTop: 0 }}>By Category</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={summary.byCategory}>
            <CartesianGrid strokeDasharray="4 4" stroke="#ded4c2" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {summary.byCategory.map((entry, index) => (
                <Cell
                  key={`${entry.name}-${index}`}
                  fill={entry.color || "#d56f36"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
