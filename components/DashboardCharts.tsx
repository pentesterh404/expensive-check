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

function CustomTooltip({ active, payload, label, formatCurrency }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="card" style={{
        padding: "12px 16px",
        border: "1px solid var(--line)",
        background: "var(--panel)",
        backdropFilter: "blur(12px)",
        boxShadow: "var(--shadow-lg)",
        borderRadius: "var(--radius-md)"
      }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: "0.8125rem", color: "var(--muted)", textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ margin: "4px 0 0", color: "var(--ink)", fontWeight: 700, fontSize: '1.125rem' }}>
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
}

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
            <AreaChart data={summary.dailySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickFormatter={(value: string) => new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickFormatter={(value: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)}
              />
              <Tooltip
                content={<CustomTooltip formatCurrency={formatCurrency} />}
                cursor={{ stroke: 'var(--accent)', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="var(--primary)"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorAmount)"
                animationDuration={1500}
                dot={{ r: 4, fill: "#fff", stroke: "var(--primary)", strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--primary)' }}
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
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Tooltip
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const percent = totalByCategory > 0 ? (data.value / totalByCategory) * 100 : 0;
                    return (
                      <div className="card" style={{
                        padding: "12px 16px",
                        border: "1px solid var(--line)",
                        background: "var(--panel)",
                        backdropFilter: "blur(12px)",
                        boxShadow: "var(--shadow-lg)",
                        borderRadius: "var(--radius-md)"
                      }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: "0.8125rem", color: "var(--muted)", textTransform: 'uppercase', letterSpacing: '0.05em' }}>{data.name}</p>
                        <p style={{ margin: "4px 0 0", color: "var(--ink)", fontWeight: 700, fontSize: '1.125rem' }}>
                          {formatCurrency(data.value)} <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: '0.875rem' }}>({percent.toFixed(1)}%)</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                layout={isNarrow ? "horizontal" : "vertical"}
                align={isNarrow ? "center" : "right"}
                verticalAlign={isNarrow ? "bottom" : "middle"}
                iconType="circle"
                wrapperStyle={isNarrow ? { paddingTop: 20 } : { paddingLeft: 20 }}
              />
              <Pie
                data={summary.byCategory}
                dataKey="value"
                nameKey="name"
                cx={isNarrow ? "50%" : "40%"}
                cy={isNarrow ? "40%" : "50%"}
                outerRadius={isNarrow ? 100 : 120}
                innerRadius={isNarrow ? 60 : 80}
                stroke="none"
                paddingAngle={5}
                animationBegin={0}
                animationDuration={1200}
              >
                {summary.byCategory.map((entry, index) => (
                  <Cell
                    key={`${entry.name}-${index}`}
                    fill={entry.color || "#3b82f6"}
                    className="pie-cell"
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
