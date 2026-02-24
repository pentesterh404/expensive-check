"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="button secondary"
      style={{ padding: "6px 10px" }}
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("Delete this expense?")) return;
        startTransition(async () => {
          const res = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
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
