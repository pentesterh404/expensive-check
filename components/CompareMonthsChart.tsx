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
    <div className="compare-chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 8, left: 6 }}
          barCategoryGap="24%"
        >
          <CartesianGrid strokeDasharray="4 4" stroke="#ded4c2" />
          <XAxis dataKey="category" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value: number) =>
              new Intl.NumberFormat("en-US", {
                notation: "compact",
                maximumFractionDigits: 1
              }).format(value)
            }
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatCurrency(value), name]}
          />
          <Legend />
          <Bar name={leftLabel} dataKey="leftTotal" fill="#225a43" radius={[6, 6, 0, 0]} />
          <Bar name={rightLabel} dataKey="rightTotal" fill="#d56f36" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

