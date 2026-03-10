"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";

type CategoryOption = { slug: string; name: string };
type MonthOption = { value: string; label: string };

export function ExpensesToolbar({
  categories,
  monthOptions,
  selectedMonth,
  rows
}: {
  categories: CategoryOption[];
  monthOptions: MonthOption[];
  selectedMonth: string;
  rows: any[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [month, setMonth] = useState(searchParams.get("month") ?? selectedMonth);
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    setMonth(searchParams.get("month") ?? selectedMonth);
    setCategory(searchParams.get("category") ?? "");
    setStatus(searchParams.get("status") ?? "");
  }, [searchParams, selectedMonth]);

  function apply(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("from");
    params.delete("to");
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/expenses?${params.toString()}`);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      apply({ q });
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function exportExcel() {
    const headers = [
      "Date",
      "Time",
      "Bill ID",
      "Description",
      "Category",
      "Tags",
      "Wallet",
      "Amount (VND)",
      "Status"
    ];

    const formatTime = (value?: string) => {
      if (!value) return "-";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "-";
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    };

    const escapeHtml = (value: string) => {
      return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    };

    const bodyRows = rows.map((row) => [
      row.expenseDate,
      formatTime(row.receivedAt),
      row.id,
      row.description || "-",
      row.category ?? "-",
      row.tags.length ? row.tags.map((tag: any) => `#${tag}`).join(" ") : "-",
      row.wallet ?? "-",
      String(Math.round(row.amount)),
      row.status
    ]);

    const tableHtml = `
      <table border="1">
        <thead>
          <tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${bodyRows
        .map(
          (cells) =>
            `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
        )
        .join("")}
        </tbody>
      </table>
    `;

    const content = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8" />
        </head>
        <body>${tableHtml}</body>
      </html>
    `;

    const blob = new Blob([`\uFEFF${content}`], {
      type: "application/vnd.ms-excel;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="toolbar" style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', flex: '1 1 300px', minWidth: 200 }}>
        <MagnifyingGlassIcon
          width={18}
          height={18}
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Bill ID or text..."
          className="input"
          style={{ paddingLeft: 42, width: '100%', height: 42, display: 'flex', alignItems: 'center' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, flex: '1 1 auto', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <FunnelIcon width={16} height={16} style={{ color: 'var(--muted)', opacity: 0.7 }} />
          <select
            value={month}
            disabled={monthOptions.length === 0}
            className="input"
            style={{ width: 140, height: 42, padding: '0 12px' }}
            onChange={(e) => {
              const value = e.target.value;
              setMonth(value);
              apply({ month: value });
            }}
          >
            {monthOptions.length === 0 ? (
              <option value="">No month data</option>
            ) : (
              monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            )}
          </select>
        </div>

        <select
          value={category}
          className="input"
          style={{ width: 140, height: 42, padding: '0 12px' }}
          onChange={(e) => {
            const value = e.target.value;
            setCategory(value);
            apply({ category: value });
          }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          className="input"
          style={{ width: 140, height: 42, padding: '0 12px' }}
          onChange={(e) => {
            const value = e.target.value;
            setStatus(value);
            apply({ status: value });
          }}
        >
          <option value="">All status</option>
          <option value="REVIEW_QUEUE">Review Queue</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="UNPARSED">Unparsed</option>
          <option value="CONFIRMED">Confirmed</option>
        </select>

        <div style={{ width: 1, height: 24, background: 'var(--line)', margin: '0 4px' }} />

        <button
          type="button"
          className="button secondary"
          onClick={exportExcel}
          disabled={rows.length === 0}
          style={{ height: 42, padding: '0 16px', fontSize: '0.875rem', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Export Excel
        </button>
      </div>
    </div>
  );
}
