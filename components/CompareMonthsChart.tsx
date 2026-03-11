"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type CompareDatum = {
  category: string;
  leftTotal: number;
  rightTotal: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(value);
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="card" style={{
        padding: "10px 14px",
        border: "1px solid var(--accent-light)",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        boxShadow: "var(--shadow-md)"
      }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: "var(--ink)" }}>{label}</p>
        <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
          {payload.map((p: any, index: number) => (
            <p key={`${p.name}-${index}`} style={{ margin: 0, fontSize: "0.85rem", color: p.color, fontWeight: 500 }}>
              {p.name}: <span style={{ color: "var(--ink)", fontWeight: 600 }}>{formatCurrency(p.value)}</span>
            </p>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function CompareMonthsChart({
  data,
  leftLabel,
  rightLabel
}: {
  data: CompareDatum[];
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          barGap={8}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
          <XAxis
            dataKey="category"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickFormatter={(value: number) =>
              new Intl.NumberFormat("en-US", {
                notation: "compact",
                maximumFractionDigits: 1
              }).format(value)
            }
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
          <Legend iconType="circle" wrapperStyle={{ paddingTop: 20, fontSize: "0.85rem", fontWeight: 500 }} />
          <Bar name={leftLabel} dataKey="leftTotal" fill="var(--muted)" fillOpacity={0.3} radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Bar name={rightLabel} dataKey="rightTotal" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

