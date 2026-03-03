import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/api/response";
import { requireAdminUser } from "@/lib/auth/session";

function toJsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => toJsonSafe(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toJsonSafe(item)])
    );
  }
  return value;
}

export async function GET() {
  try {
    await requireAdminUser();

    const [users, telegramIdentities, telegramLinkCodes, telegramMessages, categories, expenses, auditLogs] =
      await Promise.all([
        prisma.user.findMany(),
        prisma.telegramIdentity.findMany(),
        prisma.telegramLinkCode.findMany(),
        prisma.telegramMessage.findMany(),
        prisma.category.findMany(),
        prisma.expense.findMany({
          select: {
            id: true,
            userId: true,
            telegramMessageId: true,
            categoryId: true,
            expenseDate: true,
            amount: true,
            currency: true,
            rawText: true,
            description: true,
            tags: true,
            wallet: true,
            status: true,
            deletedAt: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        prisma.auditLog.findMany()
      ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      data: toJsonSafe({
        users,
        telegramIdentities,
        telegramLinkCodes,
        telegramMessages,
        categories,
        expenses,
        auditLogs
      })
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="expense-tracker-backup-${new Date()
          .toISOString()
          .replace(/[:.]/g, "-")}.json"`
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return errorResponse(401, "Unauthorized");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return errorResponse(403, "Admin only");
    }
    console.error(error);
    return errorResponse(500, "Failed to export DB");
  }
}
