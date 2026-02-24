"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type CategoryOption = { slug: string; name: string };

export function ExpensesToolbar({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    setFrom(searchParams.get("from") ?? "");
    setTo(searchParams.get("to") ?? "");
    setCategory(searchParams.get("category") ?? "");
    setStatus(searchParams.get("status") ?? "");
  }, [searchParams]);

  function apply(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/expenses?${params.toString()}`);
  }

  return (
    <div className="toolbar">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search text..." />
      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All status</option>
        <option value="REVIEW_QUEUE">REVIEW_QUEUE</option>
        <option value="PENDING_REVIEW">PENDING_REVIEW</option>
        <option value="UNPARSED">UNPARSED</option>
        <option value="CONFIRMED">CONFIRMED</option>
      </select>
      <button className="button" type="button" onClick={() => apply({ q, from, to, category, status })}>
        Apply Filters
      </button>
      <button className="button secondary" type="button" onClick={() => apply({ status: "REVIEW_QUEUE" })}>
        Review Queue
      </button>
      <button
        className="button secondary"
        type="button"
        onClick={() => {
          setQ("");
          setFrom("");
          setTo("");
          setCategory("");
          setStatus("");
          router.push("/expenses");
        }}
      >
        Reset
      </button>
    </div>
  );
}
