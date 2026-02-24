import { prisma } from "@/lib/db";
import { withUser } from "@/lib/api/with-auth";
import { errorResponse, ok } from "@/lib/api/response";
import { categorySchema } from "@/lib/validation";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    return await withUser(async (user) => {
      const existing = await prisma.category.findFirst({ where: { id, userId: user.id } });
      if (!existing) return errorResponse(404, "Category not found");

      const body = await req.json().catch(() => null);
      const parsed = categorySchema.partial().safeParse(body);
      if (!parsed.success) return errorResponse(400, "Invalid payload", parsed.error.flatten());

      const category = await prisma.category.update({
        where: { id },
        data: parsed.data
      });
      return ok(category);
    });
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Failed to update category");
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    return await withUser(async (user) => {
      const existing = await prisma.category.findFirst({ where: { id, userId: user.id } });
      if (!existing) return errorResponse(404, "Category not found");
      await prisma.category.delete({ where: { id } });
      return ok({ success: true });
    });
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Failed to delete category");
  }
}
