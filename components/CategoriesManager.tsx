"use client";

import { useEffect, useState, useTransition, type MouseEvent } from "react";
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
    <section className="grid cols-2">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Create Category</h3>
        <div className="toolbar" style={{ display: "grid" }}>
          <input
            placeholder="Name (e.g. Food)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            placeholder="Slug (e.g. food)"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          />
          <input
            placeholder="Color (#d56f36)"
            value={form.color}
            onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
          />
          <div className="card" style={{ padding: 12 }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>Color Palette</div>
            <div className="toolbar" style={{ gap: 8 }}>
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
                      borderRadius: 999,
                      border: selected ? "2px solid #1d1b16" : "1px solid #ded4c2",
                      background: color,
                      cursor: "pointer",
                      padding: 0
                    }}
                  />
                );
              })}
              <input
                type="color"
                value={/^#([0-9a-f]{6})$/i.test(form.color) ? form.color : "#d56f36"}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                title="Custom color"
                style={{
                  width: 40,
                  height: 28,
                  border: "1px solid #ded4c2",
                  borderRadius: 8,
                  padding: 2,
                  background: "#fff"
                }}
              />
            </div>
            <div className="muted" style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
              <span>Preview:</span>
              <span
                className="badge"
                style={{
                  borderColor: form.color || "#ded4c2",
                  background: form.color ? `${form.color}22` : undefined
                }}
              >
                {form.color || "No color selected"}
              </span>
            </div>
          </div>
          <input
            placeholder="Icon (optional)"
            value={form.icon}
            onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
          />
          <button className="button" type="button" disabled={isPending} onClick={onCreate}>
            {isPending && pendingAction === "create" ? "Creating..." : "Create Category"}
          </button>
          {error && <div style={{ color: "#b42318" }}>{error}</div>}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Existing Categories</h3>

        {editingId ? (
          <div className="card" style={{ marginBottom: 12 }}>
            <h4 style={{ marginTop: 0 }}>Edit Category</h4>
            <div className="toolbar" style={{ display: "grid" }}>
              <input
                placeholder="Name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
              <input
                placeholder="Slug"
                value={editForm.slug}
                onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
              />
              <input
                placeholder="Color"
                value={editForm.color}
                onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
              />
              <div className="card" style={{ padding: 12 }}>
                <div style={{ marginBottom: 8, fontWeight: 600 }}>Color Palette</div>
                <div className="toolbar" style={{ gap: 8 }}>
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
                          width: 28,
                          height: 28,
                          borderRadius: 999,
                          border: selected ? "2px solid #1d1b16" : "1px solid #ded4c2",
                          background: color,
                          cursor: "pointer",
                          padding: 0
                        }}
                      />
                    );
                  })}
                  <input
                    type="color"
                    value={/^#([0-9a-f]{6})$/i.test(editForm.color) ? editForm.color : "#d56f36"}
                    onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
                    title="Custom color"
                    style={{
                      width: 40,
                      height: 28,
                      border: "1px solid #ded4c2",
                      borderRadius: 8,
                      padding: 2,
                      background: "#fff"
                    }}
                  />
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="muted">Preview:</span>
                  <span
                    className="badge"
                    style={{
                      borderColor: editForm.color || "#ded4c2",
                      background: editForm.color ? `${editForm.color}22` : undefined
                    }}
                  >
                    {editForm.color || "No color selected"}
                  </span>
                </div>
              </div>
              <input
                placeholder="Icon"
                value={editForm.icon}
                onChange={(e) => setEditForm((f) => ({ ...f, icon: e.target.value }))}
              />
              <div className="toolbar">
                <button className="button" type="button" disabled={isPending} onClick={saveEdit}>
                  {isPending && pendingAction === "edit" ? "Saving..." : "Save"}
                </button>
                <button
                  className="button secondary"
                  type="button"
                  disabled={isPending}
                  onClick={() => setEditingId(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="table-wrap">
          <table>
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
                  <td>{c.name}</td>
                  <td>{c.slug}</td>
                  <td>
                    <button
                      type="button"
                      className="button secondary"
                      title="Quick change color"
                      style={{ padding: "2px 8px" }}
                      onClick={(event) => openQuickColorPicker(event, c)}
                    >
                      <span className="badge" style={{ borderColor: c.color ?? undefined }}>
                        {c.color ?? "-"}
                      </span>
                    </button>
                  </td>
                  <td>{c.icon ?? "-"}</td>
                  <td>
                    <div className="toolbar" style={{ gap: 6 }}>
                      <button
                        className="button secondary"
                        type="button"
                        style={{ padding: "6px 10px" }}
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
                  style={{ minWidth: 38, padding: "6px 10px" }}
                >
                  <ChevronLeftIcon aria-hidden="true" width={16} height={16} />
                </button>
                <span className="badge">{safePage}/{totalPages}</span>
                <button
                  type="button"
                  className="button secondary"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                  style={{ minWidth: 38, padding: "6px 10px" }}
                >
                  <ChevronRightIcon aria-hidden="true" width={16} height={16} />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {quickColorCategoryId && quickColorAnchor ? (
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
              top: quickColorAnchor.top,
              left: quickColorAnchor.left,
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
      ) : null}
    </section>
  );
}
