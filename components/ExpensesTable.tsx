"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteExpenseButton } from "@/components/DeleteExpenseButton";

type ExpenseRow = {
  id: string;
  expenseDate: string;
  receivedAt?: string;
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

function formatTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
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
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>("PENDING_REVIEW");
  const [editCategorySlug, setEditCategorySlug] = useState<string>("");
  const [bulkAction, setBulkAction] = useState<"confirm" | "delete" | null>(null);
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
    setSavingId(expenseId);
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
      setSavingId(null);
      return;
    }

    setEditingId(null);
    setSavingId(null);
    router.refresh();
  }

  function startEdit(row: ExpenseRow) {
    setEditingId(row.id);
    setEditStatus(row.status);
    setEditCategorySlug(row.categorySlug ?? "");
  }

  function runBulkConfirm() {
    if (selectedIds.length === 0) return;
    setBulkAction("confirm");
    startTransition(async () => {
      try {
        for (const id of selectedIds) {
          await fetch(`/api/expenses/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "CONFIRMED" })
          });
        }
        setSelectedIds([]);
        router.refresh();
      } finally {
        setBulkAction(null);
      }
    });
  }

  function runBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected expenses?`)) return;
    setBulkAction("delete");
    startTransition(async () => {
      try {
        for (const id of selectedIds) {
          await fetch(`/api/expenses/${id}`, { method: "DELETE" });
        }
        setSelectedIds([]);
        router.refresh();
      } finally {
        setBulkAction(null);
      }
    });
  }

  return (
    <div className="card expense-table-card">
      {showBulkActions && (
        <div className="review-toolbar">
          <div className="review-toolbar-left">
            <span className="badge">Review Queue</span>
            <span className="muted review-selected">{selectedIds.length} selected</span>
          </div>
          <div className="review-toolbar-actions">
            <button
              type="button"
              className="button"
              disabled={isPending || selectedIds.length === 0}
              onClick={runBulkConfirm}
            >
              {isPending && bulkAction === "confirm" ? "Confirming..." : "Bulk Confirm"}
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={isPending || selectedIds.length === 0}
              onClick={runBulkDelete}
            >
              {isPending && bulkAction === "delete" ? "Deleting..." : "Bulk Delete"}
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="expense-empty">
          <strong>No expenses found.</strong>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Try changing filters or wait for new Telegram messages.
          </p>
        </div>
      ) : (
      <div className="table-wrap">
        <table className="expense-table">
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
              <th>Time</th>
              <th>Description</th>
              <th>Category</th>
              <th>Tags</th>
              <th>Wallet</th>
              <th>Status</th>
              <th className="th-right">Confidence</th>
              <th className="th-right">Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const isEditing = editingId === e.id;
              const isSaving = savingId === e.id;
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
                  <td>{formatTime(e.receivedAt)}</td>
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
                  <td className="td-right">{Math.round(e.parseConfidence * 100)}%</td>
                  <td className="td-right">{formatCurrency(e.amount)}</td>
                  <td>
                    <div className="row-actions">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="button row-action-btn"
                            disabled={isSaving}
                            onClick={() => {
                              void saveEdit(e.id);
                            }}
                          >
                            {isSaving ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            className="button secondary row-action-btn"
                            disabled={isSaving}
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="button secondary row-action-btn"
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
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
