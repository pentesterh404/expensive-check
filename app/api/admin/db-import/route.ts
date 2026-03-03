import { prisma } from "@/lib/db";
import { errorResponse, ok } from "@/lib/api/response";
import { requireAdminUser } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/auth/roles";

type BackupPayload = {
  data?: {
    users?: any[];
    telegramIdentities?: any[];
    telegramLinkCodes?: any[];
    telegramMessages?: any[];
    categories?: any[];
    expenses?: any[];
    auditLogs?: any[];
  };
};

function toDate(value: unknown) {
  return value ? new Date(String(value)) : undefined;
}

function toBigInt(value: unknown) {
  if (value === null || value === undefined) return null;
  return BigInt(String(value));
}

export async function POST(req: Request) {
  try {
    await requireAdminUser();

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return errorResponse(400, "Missing backup file");
    }

    const text = await file.text();
    const payload = JSON.parse(text) as BackupPayload;
    const data = payload.data;
    if (!data) return errorResponse(400, "Invalid backup payload");

    const users = Array.isArray(data.users) ? data.users : [];
    const telegramIdentities = Array.isArray(data.telegramIdentities) ? data.telegramIdentities : [];
    const telegramLinkCodes = Array.isArray(data.telegramLinkCodes) ? data.telegramLinkCodes : [];
    const telegramMessages = Array.isArray(data.telegramMessages) ? data.telegramMessages : [];
    const categories = Array.isArray(data.categories) ? data.categories : [];
    const expenses = Array.isArray(data.expenses) ? data.expenses : [];
    const auditLogs = Array.isArray(data.auditLogs) ? data.auditLogs : [];

    if (users.length === 0) {
      return errorResponse(400, "Backup file has no users");
    }

    const hasAdminAccount = users.some(
      (user) => typeof user?.email === "string" && isAdminEmail(user.email)
    );
    if (!hasAdminAccount) {
      return errorResponse(400, "Backup must include admin@nvth.com account");
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.expense.deleteMany({});
      await tx.auditLog.deleteMany({});
      await tx.telegramMessage.deleteMany({});
      await tx.telegramLinkCode.deleteMany({});
      await tx.telegramIdentity.deleteMany({});
      await tx.category.deleteMany({});
      await tx.user.deleteMany({});

      await tx.user.createMany({
        data: users.map((u) => ({
          id: String(u.id),
          email: String(u.email),
          passwordHash: String(u.passwordHash),
          displayName: u.displayName ?? null,
          createdAt: toDate(u.createdAt) ?? new Date(),
          updatedAt: toDate(u.updatedAt) ?? new Date()
        }))
      });

      if (telegramIdentities.length > 0) {
        await tx.telegramIdentity.createMany({
          data: telegramIdentities.map((item) => ({
            id: String(item.id),
            userId: String(item.userId),
            telegramUserId: toBigInt(item.telegramUserId) as bigint,
            telegramChatId: toBigInt(item.telegramChatId),
            username: item.username ?? null,
            linkedAt: toDate(item.linkedAt) ?? new Date()
          }))
        });
      }

      if (telegramLinkCodes.length > 0) {
        await tx.telegramLinkCode.createMany({
          data: telegramLinkCodes.map((item) => ({
            id: String(item.id),
            userId: String(item.userId),
            code: String(item.code),
            expiresAt: toDate(item.expiresAt) ?? new Date(),
            usedAt: toDate(item.usedAt) ?? null,
            createdAt: toDate(item.createdAt) ?? new Date()
          }))
        });
      }

      if (telegramMessages.length > 0) {
        await tx.telegramMessage.createMany({
          data: telegramMessages.map((item) => ({
            id: String(item.id),
            userId: item.userId ? String(item.userId) : null,
            chatId: toBigInt(item.chatId) as bigint,
            messageId: Number(item.messageId),
            telegramUserId: toBigInt(item.telegramUserId),
            rawUpdate: item.rawUpdate ?? {},
            rawText: item.rawText ?? null,
            parsedPayload: item.parsedPayload ?? null,
            createdAt: toDate(item.createdAt) ?? new Date(),
            updatedAt: toDate(item.updatedAt) ?? new Date()
          }))
        });
      }

      if (categories.length > 0) {
        await tx.category.createMany({
          data: categories.map((item) => ({
            id: String(item.id),
            userId: String(item.userId),
            name: String(item.name),
            slug: String(item.slug),
            color: item.color ?? null,
            icon: item.icon ?? null,
            createdAt: toDate(item.createdAt) ?? new Date(),
            updatedAt: toDate(item.updatedAt) ?? new Date()
          }))
        });
      }

      if (expenses.length > 0) {
        await tx.expense.createMany({
          data: expenses.map((item) => ({
            id: String(item.id),
            userId: String(item.userId),
            telegramMessageId: item.telegramMessageId ? String(item.telegramMessageId) : null,
            categoryId: item.categoryId ? String(item.categoryId) : null,
            expenseDate: toDate(item.expenseDate) ?? new Date(),
            amount: item.amount ?? 0,
            currency: item.currency ? String(item.currency) : "VND",
            rawText: item.rawText ?? null,
            description: item.description ?? null,
            tags: Array.isArray(item.tags) ? item.tags.map((tag: unknown) => String(tag)) : [],
            wallet: item.wallet ?? null,
            status: item.status,
            deletedAt: toDate(item.deletedAt) ?? null,
            createdAt: toDate(item.createdAt) ?? new Date(),
            updatedAt: toDate(item.updatedAt) ?? new Date()
          }))
        });
      }

      if (auditLogs.length > 0) {
        await tx.auditLog.createMany({
          data: auditLogs.map((item) => ({
            id: String(item.id),
            userId: item.userId ? String(item.userId) : null,
            action: String(item.action),
            resource: String(item.resource),
            resourceId: item.resourceId ? String(item.resourceId) : null,
            meta: item.meta ?? null,
            createdAt: toDate(item.createdAt) ?? new Date()
          }))
        });
      }

      return {
        users: users.length,
        telegram_identities: telegramIdentities.length,
        telegram_link_codes: telegramLinkCodes.length,
        telegram_messages: telegramMessages.length,
        categories: categories.length,
        expenses: expenses.length,
        audit_logs: auditLogs.length
      };
    });

    return ok({
      success: true,
      message: "Database import completed",
      result
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return errorResponse(401, "Unauthorized");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return errorResponse(403, "Admin only");
    }
    if (error instanceof SyntaxError) {
      return errorResponse(400, "Invalid JSON backup file");
    }
    console.error(error);
    return errorResponse(500, "Failed to import DB");
  }
}
