"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type CategoryOption = { slug: string; name: string };
type MonthOption = { value: string; label: string };

export function ExpensesToolbar({
  categories,
  monthOptions,
  selectedMonth
}: {
  categories: CategoryOption[];
  monthOptions: MonthOption[];
  selectedMonth: string;
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

  return (
    <div className="toolbar">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Bill ID..." />
      <select
        value={month}
        disabled={monthOptions.length === 0}
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
      <select
        value={category}
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
        onChange={(e) => {
          const value = e.target.value;
          setStatus(value);
          apply({ status: value });
        }}
      >
        <option value="">All status</option>
        <option value="REVIEW_QUEUE">REVIEW_QUEUE</option>
        <option value="PENDING_REVIEW">PENDING_REVIEW</option>
        <option value="UNPARSED">UNPARSED</option>
        <option value="CONFIRMED">CONFIRMED</option>
      </select>
    </div>
  );
}
