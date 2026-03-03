"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

export function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
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
            showToast(data.error || "Delete failed", "error");
            return;
          }
          showToast("Expense deleted", "success");
          router.refresh();
        });
      }}
    >
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
