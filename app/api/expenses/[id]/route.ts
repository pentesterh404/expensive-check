import { prisma } from "@/lib/db";
import { withUser } from "@/lib/api/with-auth";
import { errorResponse, ok } from "@/lib/api/response";
import { expensePatchSchema } from "@/lib/validation";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    return await withUser(async (user) => {
      const existing = await prisma.expense.findFirst({
        where: { id, userId: user.id },
        select: { id: true }
      });
      if (!existing) return errorResponse(404, "Expense not found");

      const body = await req.json().catch(() => null);
      const parsed = expensePatchSchema.safeParse(body);
      if (!parsed.success) return errorResponse(400, "Invalid payload", parsed.error.flatten());

      const expense = await prisma.expense.update({
        where: { id },
        data: {
          ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
          ...(parsed.data.amount !== undefined ? { amount: parsed.data.amount } : {}),
          ...(parsed.data.expenseDate !== undefined
            ? { expenseDate: new Date(parsed.data.expenseDate) }
            : {}),
          ...(parsed.data.categoryId !== undefined ? { categoryId: parsed.data.categoryId } : {}),
          ...(parsed.data.tags !== undefined ? { tags: parsed.data.tags } : {}),
          ...(parsed.data.wallet !== undefined ? { wallet: parsed.data.wallet } : {}),
          ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
          ...(parsed.data.deletedAt !== undefined
            ? { deletedAt: parsed.data.deletedAt ? new Date(parsed.data.deletedAt) : null }
            : {})
        }
      });

      return ok({ id: expense.id, amount: Number(expense.amount) });
    });
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Failed to update expense");
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    return await withUser(async (user) => {
      const existing = await prisma.expense.findFirst({
        where: { id, userId: user.id },
        select: { id: true }
      });
      if (!existing) return errorResponse(404, "Expense not found");

      await prisma.expense.update({
        where: { id },
        data: { status: "DELETED", deletedAt: new Date() }
      });

      return ok({ success: true });
    });
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Failed to delete expense");
  }
}
