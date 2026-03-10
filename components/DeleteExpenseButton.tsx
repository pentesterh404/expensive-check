"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setShowConfirm(false);
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
  }

  return (
    <>
      <button
        type="button"
        className="button secondary"
        style={{ padding: "6px 10px" }}
        disabled={isPending}
        onClick={() => setShowConfirm(true)}
      >
        {isPending ? "Deleting..." : "Delete"}
      </button>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive={true}
        isLoading={isPending}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
