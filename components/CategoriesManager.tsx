"use client";

import { useEffect, useState, useTransition, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { DeleteCategoryButton } from "@/components/DeleteCategoryButton";
import { useToast } from "@/components/ToastProvider";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
};

const COLOR_PRESETS = [
  "#d56f36",
  "#225a43",
  "#8f5c2c",
  "#a83f2f",
  "#2563eb",
  "#0f766e",
  "#7c3aed",
  "#be185d",
  "#ea580c",
  "#65a30d",
  "#374151",
  "#14b8a6"
];

export function CategoriesManager({ categories }: { categories: CategoryRow[] }) {
  const PAGE_SIZE = 10;
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    color: "",
    icon: ""
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    color: "",
    icon: ""
  });
  const [quickColorCategoryId, setQuickColorCategoryId] = useState<string | null>(null);
  const [quickColorValue, setQuickColorValue] = useState<string>("");
  const [quickColorSaving, setQuickColorSaving] = useState(false);
  const [quickColorAnchor, setQuickColorAnchor] = useState<{ top: number; left: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(categories.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pagedCategories = categories.slice(pageStart, pageEnd);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  function onCreate() {
    setError(null);
    setPendingAction("create");
    startTransition(async () => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          color: form.color || null,
          icon: form.icon || null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Create category failed");
        showToast(data.error || "Create category failed", "error");
        setPendingAction(null);
        return;
      }
      setForm({ name: "", slug: "", color: "", icon: "" });
      showToast("Category created", "success");
      setPendingAction(null);
      router.refresh();
    });
  }

  function openEdit(category: CategoryRow) {
    setError(null);
    setQuickColorCategoryId(null);
    setQuickColorAnchor(null);
    setEditingId(category.id);
    setEditForm({
      name: category.name,
      slug: category.slug,
      color: category.color ?? "",
      icon: category.icon ?? ""
    });
  }

  function saveEdit() {
    if (!editingId) return;
    setError(null);
    setPendingAction("edit");
    startTransition(async () => {
      const res = await fetch(`/api/categories/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          slug: editForm.slug,
          color: editForm.color || null,
          icon: editForm.icon || null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Update category failed");
        showToast(data.error || "Update category failed", "error");
        setPendingAction(null);
        return;
      }
      setEditingId(null);
      showToast("Category updated", "success");
      setPendingAction(null);
      router.refresh();
    });
  }

  function openQuickColorPicker(event: MouseEvent<HTMLButtonElement>, category: CategoryRow) {
    const rect = event.currentTarget.getBoundingClientRect();
    const maxLeft = Math.max(12, window.innerWidth - 340);
    setQuickColorAnchor({
      top: Math.min(rect.bottom + 8, window.innerHeight - 260),
      left: Math.max(12, Math.min(rect.left, maxLeft))
    });
    setQuickColorCategoryId(category.id);
    setQuickColorValue(category.color ?? "");
  }

  async function saveQuickColor(color: string) {
    if (!quickColorCategoryId) return;
    setQuickColorSaving(true);
    const res = await fetch(`/api/categories/${quickColorCategoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color: color || null })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Update category color failed");
      showToast(data.error || "Update category color failed", "error");
      setQuickColorSaving(false);
      return;
    }
    setQuickColorSaving(false);
    setQuickColorCategoryId(null);
    setQuickColorAnchor(null);
    showToast("Category color updated", "success");
    router.refresh();
  }

  return (
    <div className="settings-page">
      {/* New Category Form */}
      <section className="s-card">
        <div className="s-card-head">
          <h2 className="s-title">New Category</h2>
          <p className="s-subtitle">Create a new category for your expenses.</p>
        </div>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--muted)" }}>Category Name</span>
            <input
              placeholder="e.g. Food & Dining"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--muted)" }}>Slug (Unique Key)</span>
            <input
              placeholder="e.g. food-dining"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            />
          </div>

          <div style={{ padding: 14, background: "var(--bg)", border: "1px dashed var(--line)", borderRadius: "var(--radius-md)" }}>
            <div style={{ marginBottom: 12, fontWeight: 700, fontSize: "0.85rem", color: "var(--ink)" }}>Color Identity</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLOR_PRESETS.map((color) => {
                const selected = form.color.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    aria-label={`Select color ${color}`}
                    onClick={() => setForm((f) => ({ ...f, color }))}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "6px",
                      border: "none",
                      background: color,
                      cursor: "pointer",
                      padding: 0,
                      boxShadow: selected ? `0 0 0 2px white, 0 0 0 4px ${color}` : "var(--shadow-sm)",
                      transition: "all 0.2s ease"
                    }}
                  />
                );
              })}
              <div style={{ position: "relative", width: 40, height: 28 }}>
                <input
                  type="color"
                  value={/^#([0-9a-f]{6})$/i.test(form.color) ? form.color : "#6366f1"}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  title="Custom color"
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "1px solid var(--line)",
                    borderRadius: "6px",
                    padding: 0,
                    cursor: "pointer",
                    background: "none"
                  }}
                />
              </div>
            </div>
            <div className="muted" style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", fontSize: "0.85rem" }}>
              <span>Preview Label:</span>
              <span
                className="badge"
                style={{
                  color: form.color || "var(--ink)",
                  borderColor: form.color || "var(--line)",
                  background: form.color ? `${form.color}15` : "transparent",
                  fontWeight: 600
                }}
              >
                {form.name || "Preview"}
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--muted)" }}>Icon (Optional)</span>
            <input
              placeholder="e.g. 🍔"
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
            />
          </div>

          <button className="button" type="button" disabled={isPending} onClick={onCreate} style={{ marginTop: 4 }}>
            {isPending && pendingAction === "create" ? "Creating..." : "Create Category"}
          </button>
          {error && <div style={{ color: "var(--error)", fontSize: "0.85rem", marginTop: 4 }}>{error}</div>}
        </div>
      </section>

      {/* Existing Categories */}
      <section className="s-card">
        <div className="s-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 className="s-title">Existing Categories</h2>
            <p className="s-subtitle">Manage your expense categories</p>
          </div>
          <span className="s-pill s-pill--ok">{categories.length} total</span>
        </div>

        {mounted && editingId && typeof document !== "undefined" && createPortal(
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.4)",
              backdropFilter: "blur(4px)",
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
            onClick={() => { if (!isPending) setEditingId(null); }}
          >
            <div
              className="card"
              style={{
                width: "min(460px, 100%)",
                padding: 28,
                margin: "0 auto",
                background: "var(--panel-solid)",
                boxShadow: "var(--shadow-xl)",
                border: "1px solid var(--line)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                maxHeight: "90vh",
                overflow: "auto",
                borderRadius: "var(--radius-xl)",
                animation: "modalIn 0.2s ease-out",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--ink)" }}>Edit Category</h3>

              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)" }}>Name</span>
                  <input
                    placeholder="Name"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)" }}>Slug</span>
                  <input
                    placeholder="Slug"
                    value={editForm.slug}
                    onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                  />
                </div>

                <div style={{ padding: 12, background: "rgba(0,0,0,0.03)", borderRadius: 8, border: "1px dashed var(--line)" }}>
                  <div style={{ marginBottom: 8, fontWeight: 700, fontSize: "0.8rem" }}>Color Palette</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {COLOR_PRESETS.map((color) => {
                      const selected = editForm.color.toLowerCase() === color.toLowerCase();
                      return (
                        <button
                          key={color}
                          type="button"
                          title={color}
                          aria-label={`Select color ${color}`}
                          onClick={() => setEditForm((f) => ({ ...f, color }))}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "6px",
                            border: "none",
                            background: color,
                            cursor: "pointer",
                            padding: 0,
                            boxShadow: selected ? `0 0 0 2px white, 0 0 0 4px ${color}` : "var(--shadow-sm)",
                            transition: "all 0.2s ease",
                          }}
                        />
                      );
                    })}
                    <input
                      type="color"
                      value={/^#([0-9a-f]{6})$/i.test(editForm.color) ? editForm.color : "#6366f1"}
                      onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
                      title="Custom color"
                      style={{
                        width: 40,
                        height: 26,
                        border: "1px solid var(--line)",
                        borderRadius: "6px",
                        padding: 0,
                        background: "none",
                        cursor: "pointer",
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", fontSize: "0.85rem", color: "var(--muted)" }}>
                    <span>Preview:</span>
                    <span className="badge" style={{
                      color: editForm.color || "var(--ink)",
                      borderColor: editForm.color || "var(--line)",
                      background: editForm.color ? `${editForm.color}15` : "transparent",
                      fontWeight: 600,
                    }}>
                      {editForm.name || "Preview"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)" }}>Icon (Optional)</span>
                  <input
                    placeholder="e.g. 🍔"
                    value={editForm.icon}
                    onChange={(e) => setEditForm((f) => ({ ...f, icon: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
                <button
                  className="button secondary"
                  type="button"
                  disabled={isPending}
                  onClick={() => setEditingId(null)}
                >
                  Cancel
                </button>
                <button className="button" type="button" disabled={isPending} onClick={saveEdit}>
                  {isPending && pendingAction === "edit" ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        <div className="table-wrap">
          <table className="mobile-stack-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Color</th>
                <th>Icon</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pagedCategories.map((c) => (
                <tr key={c.id}>
                  <td data-label="Name" style={{ fontWeight: 600, color: "var(--ink)" }}>{c.name}</td>
                  <td data-label="Slug" className="muted" style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{c.slug}</td>
                  <td data-label="Color">
                    <button
                      type="button"
                      className="text-link-btn"
                      title="Quick change color"
                      onClick={(event) => openQuickColorPicker(event, c)}
                    >
                      <span className="badge" style={{
                        color: c.color ?? "var(--muted)",
                        borderColor: c.color ?? "var(--line)",
                        background: c.color ? `${c.color}10` : "transparent",
                        fontWeight: 600,
                        fontSize: "0.75rem"
                      }}>
                        {c.color ?? "No Color"}
                      </span>
                    </button>
                  </td>
                  <td data-label="Icon" style={{ fontSize: "1.2rem" }}>{c.icon ?? "-"}</td>
                  <td data-label="Action">
                    <div className="toolbar" style={{ gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        className="button secondary"
                        type="button"
                        style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                        onClick={() => openEdit(c)}
                      >
                        Edit
                      </button>
                      <DeleteCategoryButton categoryId={c.id} />
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No categories found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {categories.length > 0 ? (
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
              Showing {pageStart + 1}-{Math.min(categories.length, pageEnd)} / {categories.length}
            </span>
            {totalPages > 1 ? (
              <div className="toolbar" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="button secondary"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                  style={{ minWidth: 36, padding: "6px", height: 36, borderRadius: "50%" }}
                >
                  <ChevronLeftIcon aria-hidden="true" width={18} height={18} />
                </button>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--ink)" }}>
                  <span style={{ color: "var(--primary)" }}>{safePage}</span>
                  <span style={{ margin: "0 4px", color: "var(--muted)", fontWeight: 400 }}>/</span>
                  <span>{totalPages}</span>
                </div>
                <button
                  type="button"
                  className="button secondary"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                  style={{ minWidth: 36, padding: "6px", height: 36, borderRadius: "50%" }}
                >
                  <ChevronRightIcon aria-hidden="true" width={18} height={18} />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {
        quickColorCategoryId && quickColorAnchor ? (
          <div
            onClick={() => {
              if (quickColorSaving) return;
              setQuickColorCategoryId(null);
              setQuickColorAnchor(null);
            }}
            style={{ position: "fixed", inset: 0, zIndex: 95 }}
          >
            <section
              className="card"
              onClick={(event) => event.stopPropagation()}
              style={{
                position: "fixed",
                top: quickColorAnchor?.top ?? 0,
                left: quickColorAnchor?.left ?? 0,
                width: 320,
                padding: 12
              }}
            >
              <strong style={{ display: "block", marginBottom: 8 }}>Quick Color</strong>
              <div style={{ display: "grid", gap: 8 }}>
                <button
                  type="button"
                  className="button secondary"
                  disabled={quickColorSaving}
                  style={{
                    justifyContent: "flex-start",
                    borderColor: quickColorValue === "" ? "#1d4ed8" : undefined,
                    color: quickColorValue === "" ? "#1d4ed8" : undefined
                  }}
                  onClick={() => {
                    setQuickColorValue("");
                    void saveQuickColor("");
                  }}
                >
                  {quickColorSaving && quickColorValue === "" ? "Saving..." : "No color"}
                </button>

                <div className="toolbar" style={{ gap: 8 }}>
                  {COLOR_PRESETS.map((color) => {
                    const selected = quickColorValue.toLowerCase() === color.toLowerCase();
                    return (
                      <button
                        key={color}
                        type="button"
                        title={color}
                        aria-label={`Select color ${color}`}
                        disabled={quickColorSaving}
                        onClick={() => {
                          setQuickColorValue(color);
                          void saveQuickColor(color);
                        }}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 999,
                          border: selected ? "2px solid #1d1b16" : "1px solid #ded4c2",
                          background: color,
                          cursor: quickColorSaving ? "not-allowed" : "pointer",
                          padding: 0
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        ) : null
      }
    </div>
  );
}
