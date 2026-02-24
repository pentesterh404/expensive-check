"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function DeleteCategoryButton({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="button secondary"
      style={{ padding: "6px 10px" }}
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("Delete this category?")) return;
        startTransition(async () => {
          const res = await fetch(`/api/categories/${categoryId}`, { method: "DELETE" });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            alert(data.error || "Delete failed");
            return;
          }
          router.refresh();
        });
      }}
    >
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
