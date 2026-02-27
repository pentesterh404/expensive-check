import { prisma } from "@/lib/db";
import { errorResponse, ok } from "@/lib/api/response";
import { requireAdminUser } from "@/lib/auth/session";
import { DEFAULT_USER_CATEGORIES } from "@/lib/default-categories";

async function deleteUserData(targetUserId: string) {
  return prisma.$transaction(async (tx) => {
    const deletedExpenses = await tx.expense.deleteMany({
      where: { userId: targetUserId }
    });

    const deletedAuditLogs = await tx.auditLog.deleteMany({
      where: { userId: targetUserId }
    });

    const deletedMessages = await tx.telegramMessage.deleteMany({
      where: { userId: targetUserId }
    });

    const deletedLinks = await tx.telegramLinkCode.deleteMany({
      where: { userId: targetUserId }
    });

    const deletedIdentities = await tx.telegramIdentity.deleteMany({
      where: { userId: targetUserId }
    });

    const deletedCategories = await tx.category.deleteMany({
      where: { userId: targetUserId }
    });

    const restoredCategories = await tx.category.createMany({
      data: DEFAULT_USER_CATEGORIES.map((category) => ({
        userId: targetUserId,
        name: category.name,
        slug: category.slug,
        color: category.color
      }))
    });

    return {
      expenses_deleted: deletedExpenses.count,
      audit_logs_deleted: deletedAuditLogs.count,
      telegram_messages_deleted: deletedMessages.count,
      telegram_link_codes_deleted: deletedLinks.count,
      telegram_identities_deleted: deletedIdentities.count,
      categories_deleted: deletedCategories.count,
      default_categories_restored: restoredCategories.count
    };
  });
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdminUser();
    const body = await req.json().catch(() => ({}));
    const targetUserId =
      body && typeof body === "object" && typeof (body as { userId?: unknown }).userId === "string"
        ? (body as { userId: string }).userId
        : admin.id;

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, displayName: true }
    });
    if (!targetUser) {
      return errorResponse(404, "Target user not found");
    }

    const result = await deleteUserData(targetUserId);

    return ok({
      success: true,
      message: "Deleted user data except account",
      target_user: targetUser,
      result
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return errorResponse(401, "Unauthorized");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return errorResponse(403, "Admin only");
    }
    console.error(error);
    return errorResponse(500, "Failed to delete DB contents");
  }
}
