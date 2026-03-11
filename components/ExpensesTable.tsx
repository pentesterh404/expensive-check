"use client";

import { useEffect, useMemo, useState, useTransition, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteExpenseButton } from "@/components/DeleteExpenseButton";
import { useToast } from "@/components/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";

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
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const activeExpense = rows.find((row) => row.id === activeExpenseId) ?? null;
  const isAnyQuickSaving =
    quickCategorySaving || quickWalletSaving || quickStatusSaving || quickDescriptionSaving;
  const { showToast } = useToast();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);



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
    setShowBulkDeleteConfirm(true);
  }

  function executeBulkDelete() {
    setShowBulkDeleteConfirm(false);
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
    const dropdownWidth = 280;
    const maxLeft = window.innerWidth - dropdownWidth - 24;
    const centerLeft = rect.left + rect.width / 2 - dropdownWidth / 2;
    setQuickCategoryAnchor({
      top: Math.min(rect.bottom + 8, window.innerHeight - 220),
      left: Math.max(12, Math.min(centerLeft, maxLeft))
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
    const dropdownWidth = 280;
    const maxLeft = window.innerWidth - dropdownWidth - 24;
    const centerLeft = rect.left + rect.width / 2 - dropdownWidth / 2;
    setQuickWalletAnchor({
      top: Math.min(rect.bottom + 8, window.innerHeight - 260),
      left: Math.max(12, Math.min(centerLeft, maxLeft))
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
    const dropdownWidth = 180;
    const maxLeft = window.innerWidth - dropdownWidth - 24;
    const centerLeft = rect.left + rect.width / 2 - dropdownWidth / 2;
    setQuickStatusAnchor({
      top: Math.min(rect.bottom + 8, window.innerHeight - 260),
      left: Math.max(12, Math.min(centerLeft, maxLeft))
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


  return (
    <div className="card expense-table-card">
      {showBulkActions && (
        <div className="review-toolbar">
          <div className="review-toolbar-left">
            <span className="muted review-selected">{selectedIds.length} items selected for bulk action</span>
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

      {
        rows.length === 0 ? (
          <div className="expense-empty" style={{
            padding: '60px 24px',
            textAlign: 'center',
            background: 'var(--panel-solid)',
            border: '1px dashed var(--line)',
            borderRadius: 'var(--radius-md)',
            margin: '20px 0'
          }}>
            <FunnelIcon width={40} height={40} style={{ color: 'var(--muted)', margin: '0 auto 16px', opacity: 0.5 }} />
            <strong style={{ display: 'block', fontSize: '1.125rem', color: 'var(--ink)' }}>No expenses matched your filters</strong>
            <p className="muted" style={{ margin: "8px 0 0", fontSize: '0.875rem' }}>
              Try adjusting your search terms or date range, or wait for new transactions to sync.
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
        )
      }
      {
        !rows.length ? null : (
          <div className="table-footer">
            <div className="pagination-info">
              Showing <span>{rangeStart}</span> to <span>{rangeEnd}</span> of <span>{totalCount}</span> expenses
            </div>

            {totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  type="button"
                  className="button secondary"
                  disabled={currentPage <= 1}
                  onClick={() => router.push(pageHref(currentPage - 1) as any)}
                  aria-label="Previous page"
                  style={{ width: 36, height: 36, padding: 0 }}
                >
                  <ChevronLeftIcon width={16} height={16} />
                </button>

                <div className="page-indicator">
                  Page {currentPage} of {totalPages}
                </div>

                <button
                  type="button"
                  className="button secondary"
                  disabled={currentPage >= totalPages}
                  onClick={() => router.push(pageHref(currentPage + 1) as any)}
                  aria-label="Next page"
                  style={{ width: 36, height: 36, padding: 0 }}
                >
                  <ChevronRightIcon width={16} height={16} />
                </button>
              </div>
            )}
          </div>
        )
      }

      {
        mounted && activeExpense && typeof document !== "undefined"
          ? createPortal(
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
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16
              }}
            >
              <section
                className="card"
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "min(860px, 100%)",
                  maxHeight: "90vh",
                  overflow: "auto",
                  animation: "modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
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
            </div>,
            document.body
          ) : null
      }

      {
        mounted && quickCategoryExpenseId && quickCategoryAnchor && typeof document !== "undefined"
          ? createPortal(
            <div
              onClick={() => {
                if (quickCategorySaving) return;
                setQuickCategoryExpenseId(null);
                setQuickCategoryAnchor(null);
              }}
              style={{ position: "fixed", inset: 0, zIndex: 9999 }}
            >
              <section
                className="card quick-action-card"
                onClick={(event) => event.stopPropagation()}
                style={{
                  position: "fixed",
                  top: quickCategoryAnchor.top,
                  left: quickCategoryAnchor.left,
                  width: 280,
                  padding: 12,
                  boxShadow: "var(--shadow-xl)",
                  border: "1px solid var(--line)"
                }}
              >
                <strong style={{ display: "block", marginBottom: 12, fontSize: '0.875rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Change Category</strong>
                <div style={{ display: "grid", gap: 4, maxHeight: 220, overflow: "auto", paddingRight: 4 }}>
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
                          border: 'none',
                          background: selected ? "var(--primary-light)" : "transparent",
                          color: selected ? "var(--primary)" : "var(--ink)",
                          fontWeight: selected ? 600 : 400,
                          fontSize: '0.875rem',
                          padding: '8px 12px'
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
            </div>,
            document.body
          ) : null
      }

      {
        mounted && quickWalletExpenseId && quickWalletAnchor && typeof document !== "undefined"
          ? createPortal(
            <div
              onClick={() => {
                if (quickWalletSaving) return;
                setQuickWalletExpenseId(null);
                setQuickWalletAnchor(null);
              }}
              style={{ position: "fixed", inset: 0, zIndex: 9999 }}
            >
              <section
                className="card quick-action-card"
                onClick={(event) => event.stopPropagation()}
                style={{
                  position: "fixed",
                  top: quickWalletAnchor.top,
                  left: quickWalletAnchor.left,
                  width: 280,
                  padding: 12,
                  boxShadow: "var(--shadow-xl)",
                  border: "1px solid var(--line)"
                }}
              >
                <strong style={{ display: "block", marginBottom: 12, fontSize: '0.875rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source Wallet</strong>
                <div style={{ display: "grid", gap: 4, maxHeight: 220, overflow: "auto", paddingRight: 4 }}>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={quickWalletSaving}
                    style={{
                      justifyContent: "flex-start",
                      border: 'none',
                      background: quickWalletValue === "Cash" ? "var(--primary-light)" : "transparent",
                      color: quickWalletValue === "Cash" ? "var(--primary)" : "var(--ink)",
                      fontWeight: quickWalletValue === "Cash" ? 600 : 400,
                      fontSize: '0.875rem',
                      padding: '8px 12px'
                    }}
                    onClick={() => {
                      setQuickWalletValue("Cash");
                      void saveQuickWallet("Cash");
                    }}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={quickWalletSaving}
                    style={{
                      justifyContent: "flex-start",
                      border: 'none',
                      background: quickWalletValue === "eBank" ? "var(--primary-light)" : "transparent",
                      color: quickWalletValue === "eBank" ? "var(--primary)" : "var(--ink)",
                      fontWeight: quickWalletValue === "eBank" ? 600 : 400,
                      fontSize: '0.875rem',
                      padding: '8px 12px'
                    }}
                    onClick={() => {
                      setQuickWalletValue("eBank");
                      void saveQuickWallet("eBank");
                    }}
                  >
                    eBank
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={quickWalletSaving}
                    style={{
                      justifyContent: "flex-start",
                      border: 'none',
                      background: !quickWalletValue ? "var(--primary-light)" : "transparent",
                      color: !quickWalletValue ? "var(--primary)" : "var(--ink)",
                      fontWeight: !quickWalletValue ? 600 : 400,
                      fontSize: '0.875rem',
                      padding: '8px 12px'
                    }}
                    onClick={() => {
                      setQuickWalletValue("");
                      void saveQuickWallet("");
                    }}
                  >
                    None
                  </button>
                </div>
              </section>
            </div>,
            document.body
          ) : null
      }

      {
        mounted && quickStatusExpenseId && quickStatusAnchor && typeof document !== "undefined"
          ? createPortal(
            <div
              onClick={() => {
                if (quickStatusSaving) return;
                setQuickStatusExpenseId(null);
                setQuickStatusAnchor(null);
              }}
              style={{ position: "fixed", inset: 0, zIndex: 9999 }}
            >
              <section
                className="card quick-action-card"
                onClick={(event) => event.stopPropagation()}
                style={{
                  position: "fixed",
                  top: quickStatusAnchor.top,
                  left: quickStatusAnchor.left,
                  width: 180,
                  padding: 12,
                  boxShadow: "var(--shadow-xl)",
                  border: "1px solid var(--line)"
                }}
              >
                <strong style={{ display: "block", marginBottom: 12, fontSize: '0.875rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Set Status</strong>
                <div style={{ display: "grid", gap: 4 }}>
                  {["PENDING_REVIEW", "CONFIRMED", "REJECTED"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="button secondary"
                      disabled={quickStatusSaving}
                      style={{
                        justifyContent: "flex-start",
                        border: 'none',
                        background: quickStatusValue === s ? "var(--primary-light)" : "transparent",
                        color: quickStatusValue === s ? "var(--primary)" : "var(--ink)",
                        fontWeight: quickStatusValue === s ? 600 : 400,
                        fontSize: '0.875rem',
                        padding: '8px 12px'
                      }}
                      onClick={() => {
                        setQuickStatusValue(s);
                        void saveQuickStatus(s);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </section>
            </div>,
            document.body
          ) : null
      }

      {
        mounted && descriptionDialogExpenseId && typeof document !== "undefined" ? (
          createPortal(
            <div
              role="dialog"
              aria-modal="true"
              onClick={() => {
                if (quickDescriptionSaving) return;
                setDescriptionDialogExpenseId(null);
                setDescriptionDialogValue("");
              }}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.35)",
                zIndex: 9999,
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
                  width: "min(400px, 100%)",
                  background: "var(--panel-solid)",
                  borderRadius: "var(--radius-lg)",
                  padding: 0,
                  overflow: "hidden",
                  boxShadow: "var(--shadow-xl)",
                  animation: "modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
              >
                <div style={{ padding: "24px 24px 8px" }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Edit Description</div>
                  <div style={{ color: "var(--muted)", fontSize: '0.875rem' }}>Provide a clear title for this expense.</div>
                </div>
                <div style={{ padding: "16px 24px 20px" }}>
                  <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '8px 12px', background: 'var(--bg)' }}>
                    <input
                      autoFocus
                      value={descriptionDialogValue}
                      onChange={(event) => setDescriptionDialogValue(event.target.value)}
                      placeholder="e.g. Starbucks Coffee"
                      style={{
                        width: "100%",
                        border: "0",
                        outline: "none",
                        background: "transparent",
                        color: "var(--ink)",
                        fontSize: '0.875rem',
                        padding: 0
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !quickDescriptionSaving) {
                          event.preventDefault();
                          void saveQuickDescription();
                        }
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid var(--line)" }}>
                  <button
                    type="button"
                    disabled={quickDescriptionSaving}
                    onClick={() => {
                      setDescriptionDialogExpenseId(null);
                      setDescriptionDialogValue("");
                    }}
                    style={{
                      border: 0,
                      background: "transparent",
                      color: "var(--muted)",
                      fontWeight: 500,
                      padding: "14px 12px",
                      fontSize: '0.875rem',
                      cursor: quickDescriptionSaving ? "default" : "pointer"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={quickDescriptionSaving}
                    onClick={() => void saveQuickDescription()}
                    style={{
                      border: 0,
                      borderLeft: "1px solid var(--line)",
                      background: "var(--primary)",
                      color: "#ffffff",
                      fontWeight: 600,
                      padding: "14px 12px",
                      fontSize: '0.875rem',
                      cursor: quickDescriptionSaving ? "default" : "pointer"
                    }}
                  >
                    {quickDescriptionSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </section>
            </div>,
            document.body
          )
        ) : null
      }

      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        title="Delete Multiple Expenses"
        message={`Are you sure you want to delete ${selectedIds.length} selected expenses? This action cannot be reversed.`}
        confirmLabel="Delete All"
        isDestructive={true}
        isLoading={isPending && bulkAction === "delete"}
        onConfirm={executeBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
      />
    </div >
  );
}
