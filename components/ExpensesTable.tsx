"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteExpenseButton } from "@/components/DeleteExpenseButton";

type ExpenseRow = {
  id: string;
  expenseDate: string;
  description: string;
  amount: number;
  category: string | null;
  categorySlug?: string | null;
  tags: string[];
  wallet: string | null;
  status: string;
  parseConfidence: number;
};

type CategoryOption = { id?: string; slug: string; name: string };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(value);
}

export function ExpensesTable({
  rows,
  categories,
  showBulkActions
}: {
  rows: ExpenseRow[];
  categories: CategoryOption[];
  showBulkActions: boolean;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>("PENDING_REVIEW");
  const [editCategorySlug, setEditCategorySlug] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const categoryIdBySlug = useMemo(
    () =>
      new Map(
        categories
          .filter((c) => c.id)
          .map((c) => [c.slug, c.id as string])
      ),
    [categories]
  );

  const categoryOptions = useMemo(
    () => [{ slug: "", name: "Uncategorized" }, ...categories],
    [categories]
  );

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }

  function toggleAll() {
    if (selectedIds.length === rows.length) setSelectedIds([]);
    else setSelectedIds(rows.map((r) => r.id));
  }

  async function saveEdit(expenseId: string) {
    const payload: Record<string, unknown> = {
      status: editStatus
    };
    payload.categoryId = editCategorySlug ? (categoryIdBySlug.get(editCategorySlug) ?? null) : null;

    const res = await fetch(`/api/expenses/${expenseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Failed to update expense");
      return;
    }

    setEditingId(null);
    router.refresh();
  }

  function startEdit(row: ExpenseRow) {
    setEditingId(row.id);
    setEditStatus(row.status);
    setEditCategorySlug(row.categorySlug ?? "");
  }

  function runBulkConfirm() {
    if (selectedIds.length === 0) return;
    startTransition(async () => {
      for (const id of selectedIds) {
        await fetch(`/api/expenses/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CONFIRMED" })
        });
      }
      setSelectedIds([]);
      router.refresh();
    });
  }

  function runBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected expenses?`)) return;
    startTransition(async () => {
      for (const id of selectedIds) {
        await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      }
      setSelectedIds([]);
      router.refresh();
    });
  }

  return (
    <div className="card">
      {showBulkActions && (
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <span className="badge">Review Queue Mode</span>
          <span className="muted">{selectedIds.length} selected</span>
          <button
            type="button"
            className="button"
            disabled={isPending || selectedIds.length === 0}
            onClick={runBulkConfirm}
          >
            {isPending ? "Working..." : "Bulk Confirm"}
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={isPending || selectedIds.length === 0}
            onClick={runBulkDelete}
          >
            Bulk Delete
          </button>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {showBulkActions && (
                <th>
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selectedIds.length === rows.length}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
              )}
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Tags</th>
              <th>Wallet</th>
              <th>Status</th>
              <th>Confidence</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const isEditing = editingId === e.id;
              return (
                <tr key={e.id}>
                  {showBulkActions && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(e.id)}
                        onChange={() => toggleSelected(e.id)}
                        aria-label={`Select ${e.description}`}
                      />
                    </td>
                  )}
                  <td>{e.expenseDate}</td>
                  <td>{e.description}</td>
                  <td>
                    {isEditing ? (
                      <select
                        value={editCategorySlug}
                        onChange={(event) => setEditCategorySlug(event.target.value)}
                      >
                        {categoryOptions.map((c) => (
                          <option key={c.slug || "uncategorized"} value={c.slug}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      e.category ?? "-"
                    )}
                  </td>
                  <td>{e.tags.length ? e.tags.map((t) => `#${t}`).join(" ") : "-"}</td>
                  <td>{e.wallet ?? "-"}</td>
                  <td>
                    {isEditing ? (
                      <select value={editStatus} onChange={(event) => setEditStatus(event.target.value)}>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="PENDING_REVIEW">PENDING_REVIEW</option>
                        <option value="UNPARSED">UNPARSED</option>
                      </select>
                    ) : (
                      <StatusBadge status={e.status} />
                    )}
                  </td>
                  <td>{Math.round(e.parseConfidence * 100)}%</td>
                  <td>{formatCurrency(e.amount)}</td>
                  <td>
                    <div className="toolbar" style={{ gap: 6 }}>
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="button"
                            style={{ padding: "6px 10px" }}
                            onClick={() => {
                              void saveEdit(e.id);
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="button secondary"
                            style={{ padding: "6px 10px" }}
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="button secondary"
                            style={{ padding: "6px 10px" }}
                            onClick={() => startEdit(e)}
                          >
                            Edit
                          </button>
                          <DeleteExpenseButton expenseId={e.id} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={showBulkActions ? 10 : 9} className="muted">
                  No expenses found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
