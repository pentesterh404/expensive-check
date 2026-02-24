"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DeleteCategoryButton } from "@/components/DeleteCategoryButton";

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    color: "",
    icon: ""
  });
  const [error, setError] = useState<string | null>(null);

  function onCreate() {
    setError(null);
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
        return;
      }
      setForm({ name: "", slug: "", color: "", icon: "" });
      router.refresh();
    });
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
            {isPending ? "Creating..." : "Create Category"}
          </button>
          {error && <div style={{ color: "#b42318" }}>{error}</div>}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Existing Categories</h3>
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
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.slug}</td>
                  <td>
                    <span className="badge" style={{ borderColor: c.color ?? undefined }}>
                      {c.color ?? "-"}
                    </span>
                  </td>
                  <td>{c.icon ?? "-"}</td>
                  <td>
                    <DeleteCategoryButton categoryId={c.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
