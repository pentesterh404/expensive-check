import { prisma } from "@/lib/db";
import { errorResponse, ok } from "@/lib/api/response";
import { requireAdminUser } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/auth/roles";
import { adminUpdateUserSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth/password";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminUser();
    const { id } = await context.params;

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true }
    });
    if (!target) return errorResponse(404, "User not found");
    if (isAdminEmail(target.email)) return errorResponse(403, "Cannot edit admin via this screen");

    const body = await req.json().catch(() => null);
    const parsed = adminUpdateUserSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, "Invalid payload", parsed.error.flatten());

    if (parsed.data.email && isAdminEmail(parsed.data.email)) {
      return errorResponse(400, "Reserved admin email");
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.email !== undefined) data.email = parsed.data.email;
    if (parsed.data.displayName !== undefined) data.displayName = parsed.data.displayName;
    if (parsed.data.password) data.passwordHash = await hashPassword(parsed.data.password);

    if (Object.keys(data).length === 0) return errorResponse(400, "No changes provided");

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, displayName: true, createdAt: true }
    });

    return ok({
      ...updated,
      role: isAdminEmail(updated.email) ? "ADMIN" : "USER",
      createdAt: updated.createdAt.toISOString(),
      editedBy: admin.email
    });
  } catch (error: any) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return errorResponse(401, "Unauthorized");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return errorResponse(403, "Admin only");
    }
    if (error?.code === "P2002") {
      return errorResponse(409, "Email already exists");
    }
    console.error(error);
    return errorResponse(500, "Failed to update user");
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminUser();
    const { id } = await context.params;
    if (id === admin.id) return errorResponse(400, "Cannot delete your own admin account");

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true }
    });
    if (!target) return errorResponse(404, "User not found");
    if (isAdminEmail(target.email)) return errorResponse(403, "Cannot delete admin account");

    await prisma.$transaction(async (tx) => {
      await tx.expense.deleteMany({ where: { userId: id } });
      await tx.auditLog.deleteMany({ where: { userId: id } });
      await tx.telegramMessage.deleteMany({ where: { userId: id } });
      await tx.telegramLinkCode.deleteMany({ where: { userId: id } });
      await tx.telegramIdentity.deleteMany({ where: { userId: id } });
      await tx.category.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });

    return ok({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return errorResponse(401, "Unauthorized");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return errorResponse(403, "Admin only");
    }
    console.error(error);
    return errorResponse(500, "Failed to delete user");
  }
}
