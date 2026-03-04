"use client";

import { useMemo, useState, useTransition, type MouseEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteExpenseButton } from "@/components/DeleteExpenseButton";
import { useToast } from "@/components/ToastProvider";

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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function ExpensesTable({
  rows,
  categories,
  showBulkActions,
  currentPage,
  totalPages,
  totalCount,
  pageSize
}: {
  rows: ExpenseRow[];
  categories: CategoryOption[];
  showBulkActions: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeExpenseId, setActiveExpenseId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<"confirm" | "delete" | null>(null);
  const [quickCategoryExpenseId, setQuickCategoryExpenseId] = useState<string | null>(null);
  const [quickCategorySlug, setQuickCategorySlug] = useState<string>("");
  const [quickCategorySaving, setQuickCategorySaving] = useState(false);
  const [quickCategoryAnchor, setQuickCategoryAnchor] = useState<{ top: number; left: number } | null>(null);
  const [quickWalletExpenseId, setQuickWalletExpenseId] = useState<string | null>(null);
  const [quickWalletValue, setQuickWalletValue] = useState<string>("");
  const [quickWalletSaving, setQuickWalletSaving] = useState(false);
  const [quickWalletAnchor, setQuickWalletAnchor] = useState<{ top: number; left: number } | null>(null);
  const [quickStatusExpenseId, setQuickStatusExpenseId] = useState<string | null>(null);
  const [quickStatusValue, setQuickStatusValue] = useState<string>("PENDING_REVIEW");
  const [quickStatusSaving, setQuickStatusSaving] = useState(false);
  const [quickStatusAnchor, setQuickStatusAnchor] = useState<{ top: number; left: number } | null>(null);
  const [quickDescriptionSaving, setQuickDescriptionSaving] = useState(false);
  const [descriptionDialogExpenseId, setDescriptionDialogExpenseId] = useState<string | null>(null);
  const [descriptionDialogValue, setDescriptionDialogValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const activeExpense = rows.find((row) => row.id === activeExpenseId) ?? null;
  const isAnyQuickSaving =
    quickCategorySaving || quickWalletSaving || quickStatusSaving || quickDescriptionSaving;
  const { showToast } = useToast();

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
  const walletOptions = useMemo(() => {
    const defaults = ["eBank", "momo", "cash"];
    const values = Array.from(
      new Set([...defaults, ...rows.map((row) => row.wallet).filter((w): w is string => Boolean(w))])
    );
    return values.sort((a, b) => a.localeCompare(b));
  }, [rows]);
  const statusOptions = useMemo(
    () => ["CONFIRMED", "PENDING_REVIEW", "UNPARSED"] as const,
    []
  );
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = totalCount === 0 ? 0 : Math.min(totalCount, currentPage * pageSize);

  function pageHref(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete("page");
    else params.set("page", String(page));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }

  function toggleAll() {
    if (selectedIds.length === rows.length) setSelectedIds([]);
    else setSelectedIds(rows.map((r) => r.id));
  }

  function openExpenseModal(row: ExpenseRow) {
    setActiveExpenseId(row.id);
  }

  function runBulkConfirm() {
    if (selectedIds.length === 0) return;
    setBulkAction("confirm");
    startTransition(async () => {
      try {
        const batchSize = 10;
        for (let i = 0; i < selectedIds.length; i += batchSize) {
          const batch = selectedIds.slice(i, i + batchSize);
          const responses = await Promise.all(
            batch.map((id) =>
              fetch(`/api/expenses/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "CONFIRMED" })
              })
            )
          );
          if (responses.some((res) => !res.ok)) {
            showToast("Some expenses could not be confirmed.", "error");
            break;
          }
        }
        showToast("Bulk confirm completed.", "success");
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
        const batchSize = 10;
        for (let i = 0; i < selectedIds.length; i += batchSize) {
          const batch = selectedIds.slice(i, i + batchSize);
          const responses = await Promise.all(
            batch.map((id) => fetch(`/api/expenses/${id}`, { method: "DELETE" }))
          );
          if (responses.some((res) => !res.ok)) {
            showToast("Some expenses could not be deleted.", "error");
            break;
          }
        }
        showToast("Bulk delete completed.", "success");
        setSelectedIds([]);
        router.refresh();
      } finally {
        setBulkAction(null);
      }
    });
  }

  function openQuickCategoryPicker(event: MouseEvent<HTMLButtonElement>, row: ExpenseRow) {
    if (isAnyQuickSaving) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const maxLeft = Math.max(12, window.innerWidth - 300);
    setQuickCategoryAnchor({
      top: Math.min(rect.bottom + 8, window.innerHeight - 220),
      left: Math.max(12, Math.min(rect.left, maxLeft))
    });
    setQuickWalletExpenseId(null);
    setQuickWalletAnchor(null);
    setQuickStatusExpenseId(null);
    setQuickStatusAnchor(null);
    setQuickCategoryExpenseId(row.id);
    setQuickCategorySlug(row.categorySlug ?? "");
  }

  async function saveQuickCategory(slug: string) {
    if (!quickCategoryExpenseId) return;
    setQuickCategoryExpenseId(null);
    setQuickCategoryAnchor(null);
    setQuickCategorySaving(true);
    showToast("Changing...", "info", 1200);
    try {
      const categoryId = slug ? (categoryIdBySlug.get(slug) ?? null) : null;
      const res = await fetch(`/api/expenses/${quickCategoryExpenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Quick change category failed", "error");
        return;
      }
      showToast("Category updated", "success");
      router.refresh();
    } catch {
      showToast("Quick change category failed", "error");
    } finally {
      setQuickCategorySaving(false);
    }
  }

  function openQuickWalletPicker(event: MouseEvent<HTMLButtonElement>, row: ExpenseRow) {
    if (isAnyQuickSaving) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const maxLeft = Math.max(12, window.innerWidth - 300);
    setQuickWalletAnchor({
      top: Math.min(rect.bottom + 8, window.innerHeight - 260),
      left: Math.max(12, Math.min(rect.left, maxLeft))
    });
    setQuickCategoryExpenseId(null);
    setQuickCategoryAnchor(null);
    setQuickStatusExpenseId(null);
    setQuickStatusAnchor(null);
    setQuickWalletExpenseId(row.id);
    setQuickWalletValue(row.wallet ?? "");
  }

  async function saveQuickWallet(wallet: string) {
    if (!quickWalletExpenseId) return;
    setQuickWalletExpenseId(null);
    setQuickWalletAnchor(null);
    setQuickWalletSaving(true);
    showToast("Changing...", "info", 1200);
    try {
      const res = await fetch(`/api/expenses/${quickWalletExpenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: wallet || null })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Quick change wallet failed", "error");
        return;
      }
      showToast("Wallet updated", "success");
      router.refresh();
    } catch {
      showToast("Quick change wallet failed", "error");
    } finally {
      setQuickWalletSaving(false);
    }
  }

  function openQuickStatusPicker(event: MouseEvent<HTMLButtonElement>, row: ExpenseRow) {
    if (isAnyQuickSaving) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const maxLeft = Math.max(12, window.innerWidth - 260);
    setQuickStatusAnchor({
      top: Math.min(rect.bottom + 8, window.innerHeight - 260),
      left: Math.max(12, Math.min(rect.left, maxLeft))
    });
    setQuickCategoryExpenseId(null);
    setQuickCategoryAnchor(null);
    setQuickWalletExpenseId(null);
    setQuickWalletAnchor(null);
    setQuickStatusExpenseId(row.id);
    setQuickStatusValue(row.status);
  }

  async function saveQuickStatus(status: string) {
    if (!quickStatusExpenseId) return;
    setQuickStatusExpenseId(null);
    setQuickStatusAnchor(null);
    setQuickStatusSaving(true);
    showToast("Changing...", "info", 1200);
    try {
      const res = await fetch(`/api/expenses/${quickStatusExpenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Quick change status failed", "error");
        return;
      }
      showToast("Status updated", "success");
      router.refresh();
    } catch {
      showToast("Quick change status failed", "error");
    } finally {
      setQuickStatusSaving(false);
    }
  }

  function openQuickDescriptionDialog(row: ExpenseRow) {
    if (isAnyQuickSaving) return;
    setDescriptionDialogExpenseId(row.id);
    setDescriptionDialogValue(row.description ?? "");
  }

  async function saveQuickDescription() {
    if (!descriptionDialogExpenseId) return;
    const normalized = descriptionDialogValue.trim();
    setQuickDescriptionSaving(true);
    showToast("Changing...", "info", 1200);
    try {
      const res = await fetch(`/api/expenses/${descriptionDialogExpenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: normalized || "-" })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Quick change description failed", "error");
        return;
      }
      showToast("Description updated", "success");
      setDescriptionDialogExpenseId(null);
      setDescriptionDialogValue("");
      router.refresh();
    } catch {
      showToast("Quick change description failed", "error");
    } finally {
      setQuickDescriptionSaving(false);
    }
  }

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

    const bodyRows = rows.map((row) => [
      row.expenseDate,
      formatTime(row.receivedAt),
      row.id,
      row.description || "-",
      row.category ?? "-",
      row.tags.length ? row.tags.map((tag) => `#${tag}`).join(" ") : "-",
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
    <div className="card expense-table-card">
      <div className="toolbar" style={{ marginBottom: 10 }}>
        <button type="button" className="button secondary" onClick={exportExcel} disabled={rows.length === 0}>
          Export Excel
        </button>
      </div>

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
              <th>Bill ID</th>
              <th>Description</th>
              <th>Category</th>
              <th>Wallet</th>
              <th className="th-right">Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
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
                  <td>
                    <button
                      className="text-link-btn"
                      type="button"
                      onClick={() => openExpenseModal(e)}
                      title="Open bill details"
                    >
                      {e.id}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="text-link-btn"
                      title="Quick change description"
                      onClick={() => openQuickDescriptionDialog(e)}
                    >
                      {e.description || "-"}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="text-link-btn"
                      title="Quick change category"
                      onClick={(event) => openQuickCategoryPicker(event, e)}
                    >
                      {e.category ?? "Uncategorized"}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="text-link-btn"
                      title="Quick change wallet"
                      onClick={(event) => openQuickWalletPicker(event, e)}
                    >
                      {e.wallet ?? "-"}
                    </button>
                  </td>
                  <td className="td-right">{formatCurrency(e.amount)}</td>
                  <td>
                    <button
                      type="button"
                      className="text-link-btn"
                      title="Quick change status"
                      onClick={(event) => openQuickStatusPicker(event, e)}
                    >
                      <StatusBadge status={e.status} />
                    </button>
                  </td>
                  <td>
                    <div className="row-actions">
                      <DeleteExpenseButton expenseId={e.id} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
      <div
        className="toolbar"
        style={{
          marginTop: 12,
          justifyContent: "space-between",
          alignItems: "center",
          padding: 8,
          border: "1px solid #ded4c2",
          borderRadius: 10,
          background: "#f7f3ea"
        }}
      >
        <span className="muted">
          Showing {rangeStart}-{rangeEnd} / {totalCount}
        </span>
        {totalPages > 1 ? (
          <div className="toolbar" style={{ gap: 8 }}>
            <button
              type="button"
              className="button secondary"
              disabled={currentPage <= 1}
              onClick={() => router.push(pageHref(currentPage - 1) as any)}
              aria-label="Previous page"
              style={{ minWidth: 38, padding: "6px 10px" }}
            >
              <ChevronLeftIcon aria-hidden="true" width={16} height={16} />
            </button>
            <span className="badge">{currentPage}/{totalPages}</span>
            <button
              type="button"
              className="button secondary"
              disabled={currentPage >= totalPages}
              onClick={() => router.push(pageHref(currentPage + 1) as any)}
              aria-label="Next page"
              style={{ minWidth: 38, padding: "6px 10px" }}
            >
              <ChevronRightIcon aria-hidden="true" width={16} height={16} />
            </button>
          </div>
        ) : null}
      </div>

      {activeExpense && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setActiveExpenseId(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.35)",
            zIndex: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
        >
          <section
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(860px, 100%)", maxHeight: "90vh", overflow: "auto" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Bill Details</h3>
              <StatusBadge status={activeExpense.status} />
            </div>

            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table>
                <tbody>
                  <tr><th>Bill ID</th><td>{activeExpense.id}</td></tr>
                  <tr><th>Date</th><td>{activeExpense.expenseDate}</td></tr>
                  <tr><th>Time</th><td>{formatTime(activeExpense.receivedAt)}</td></tr>
                  <tr><th>Description</th><td>{activeExpense.description}</td></tr>
                  <tr><th>Tags</th><td>{activeExpense.tags.length ? activeExpense.tags.map((t) => `#${t}`).join(" ") : "-"}</td></tr>
                  <tr><th>Wallet</th><td>{activeExpense.wallet ?? "-"}</td></tr>
                  <tr><th>Amount</th><td>{formatCurrency(activeExpense.amount)}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="toolbar" style={{ marginTop: 12, justifyContent: "flex-end" }}>
              <button
                className="button secondary"
                type="button"
                onClick={() => setActiveExpenseId(null)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {quickCategoryExpenseId && quickCategoryAnchor ? (
        <div
          onClick={() => {
            if (quickCategorySaving) return;
            setQuickCategoryExpenseId(null);
            setQuickCategoryAnchor(null);
          }}
          style={{ position: "fixed", inset: 0, zIndex: 95 }}
        >
          <section
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "fixed",
              top: quickCategoryAnchor.top,
              left: quickCategoryAnchor.left,
              width: 280,
              padding: 12
            }}
          >
            <strong style={{ display: "block", marginBottom: 8 }}>Quick Category</strong>
            <div style={{ display: "grid", gap: 6, maxHeight: 220, overflow: "auto" }}>
              {categoryOptions.map((c) => {
                const selected = quickCategorySlug === c.slug;
                return (
                  <button
                    key={c.slug || "uncategorized"}
                    type="button"
                    className="button secondary"
                    disabled={quickCategorySaving}
                    style={{
                      justifyContent: "flex-start",
                      borderColor: selected ? "#1d4ed8" : undefined,
                      color: selected ? "#1d4ed8" : undefined
                    }}
                    onClick={() => {
                      setQuickCategorySlug(c.slug);
                      void saveQuickCategory(c.slug);
                    }}
                  >
                    {quickCategorySaving && selected ? "Saving..." : c.name}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {quickWalletExpenseId && quickWalletAnchor ? (
        <div
          onClick={() => {
            if (quickWalletSaving) return;
            setQuickWalletExpenseId(null);
            setQuickWalletAnchor(null);
          }}
          style={{ position: "fixed", inset: 0, zIndex: 95 }}
        >
          <section
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "fixed",
              top: quickWalletAnchor.top,
              left: quickWalletAnchor.left,
              width: 280,
              padding: 12
            }}
          >
            <strong style={{ display: "block", marginBottom: 8 }}>Quick Wallet</strong>
            <div style={{ display: "grid", gap: 6, maxHeight: 220, overflow: "auto" }}>
              <button
                type="button"
                className="button secondary"
                disabled={quickWalletSaving}
                style={{
                  justifyContent: "flex-start",
                  borderColor: quickWalletValue === "" ? "#1d4ed8" : undefined,
                  color: quickWalletValue === "" ? "#1d4ed8" : undefined
                }}
                onClick={() => {
                  setQuickWalletValue("");
                  void saveQuickWallet("");
                }}
              >
                {quickWalletSaving && quickWalletValue === "" ? "Saving..." : "No wallet"}
              </button>
              {walletOptions.map((wallet) => {
                const selected = quickWalletValue === wallet;
                return (
                  <button
                    key={wallet}
                    type="button"
                    className="button secondary"
                    disabled={quickWalletSaving}
                    style={{
                      justifyContent: "flex-start",
                      borderColor: selected ? "#1d4ed8" : undefined,
                      color: selected ? "#1d4ed8" : undefined
                    }}
                    onClick={() => {
                      setQuickWalletValue(wallet);
                      void saveQuickWallet(wallet);
                    }}
                  >
                    {quickWalletSaving && selected ? "Saving..." : wallet}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {quickStatusExpenseId && quickStatusAnchor ? (
        <div
          onClick={() => {
            if (quickStatusSaving) return;
            setQuickStatusExpenseId(null);
            setQuickStatusAnchor(null);
          }}
          style={{ position: "fixed", inset: 0, zIndex: 95 }}
        >
          <section
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "fixed",
              top: quickStatusAnchor.top,
              left: quickStatusAnchor.left,
              width: 260,
              padding: 12
            }}
          >
            <strong style={{ display: "block", marginBottom: 8 }}>Quick Status</strong>
            <div style={{ display: "grid", gap: 6 }}>
              {statusOptions.map((status) => {
                const selected = quickStatusValue === status;
                return (
                  <button
                    key={status}
                    type="button"
                    className="text-link-btn"
                    disabled={quickStatusSaving}
                    style={{
                      justifySelf: "start",
                      border: selected ? "1px solid #1d4ed8" : "1px solid transparent",
                      borderRadius: 999
                    }}
                    onClick={() => {
                      setQuickStatusValue(status);
                      void saveQuickStatus(status);
                    }}
                  >
                    <StatusBadge status={status} />
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {descriptionDialogExpenseId ? (
        <div
          onClick={() => {
            if (quickDescriptionSaving) return;
            setDescriptionDialogExpenseId(null);
            setDescriptionDialogValue("");
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(18, 18, 24, 0.52)",
            zIndex: 98,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
        >
          <section
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(420px, 100%)",
              background: "#f8f8fb",
              color: "#1f2937",
              borderColor: "#d9d9e3",
              borderRadius: 16,
              padding: 0,
              overflow: "hidden",
              boxShadow: "0 22px 48px rgba(17, 24, 39, 0.28)"
            }}
          >
            <div style={{ padding: "24px 22px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 38, lineHeight: 1, marginBottom: 8 }}>✍️</div>
              <div style={{ fontSize: 34, fontWeight: 500, marginBottom: 6 }}>Hi again!</div>
              <div style={{ color: "#4b5563", fontSize: 14 }}>Update expense description</div>
            </div>
            <div style={{ padding: "10px 22px 20px" }}>
              <button
                type="button"
                className="button secondary"
                disabled={quickDescriptionSaving}
                style={{ width: "100%", justifyContent: "flex-start", marginBottom: 10 }}
                onClick={(event) => {
                  event.preventDefault();
                }}
              >
                <input
                  autoFocus
                  value={descriptionDialogValue}
                  onChange={(event) => setDescriptionDialogValue(event.target.value)}
                  placeholder="Description"
                  style={{
                    width: "100%",
                    border: "0",
                    outline: "none",
                    background: "transparent",
                    color: "#1f2937",
                    padding: 0
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !quickDescriptionSaving) {
                      event.preventDefault();
                      void saveQuickDescription();
                    }
                  }}
                />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid #d9d9e3" }}>
              <button
                type="button"
                disabled={quickDescriptionSaving}
                onClick={() => void saveQuickDescription()}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#2563eb",
                  fontWeight: 700,
                  padding: "14px 12px",
                  cursor: quickDescriptionSaving ? "default" : "pointer"
                }}
              >
                {quickDescriptionSaving ? "Saving..." : "Ok"}
              </button>
              <button
                type="button"
                disabled={quickDescriptionSaving}
                onClick={() => {
                  setDescriptionDialogExpenseId(null);
                  setDescriptionDialogValue("");
                }}
                style={{
                  border: 0,
                  borderLeft: "1px solid #d9d9e3",
                  background: "transparent",
                  color: "#2563eb",
                  padding: "14px 12px",
                  cursor: quickDescriptionSaving ? "default" : "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}

    </div>
  );
}
