import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withUser } from "@/lib/api/with-auth";
import { errorResponse, ok } from "@/lib/api/response";
import { expenseCreateSchema, expenseQuerySchema } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    return await withUser(async (user) => {
      const url = new URL(req.url);
      const parsedQuery = expenseQuerySchema.safeParse(
        Object.fromEntries(url.searchParams.entries())
      );
      if (!parsedQuery.success) {
        return errorResponse(400, "Invalid query", parsedQuery.error.flatten());
      }

      const q = parsedQuery.data;
      const where: Prisma.ExpenseWhereInput = {
        userId: user.id,
        deletedAt: null,
        ...(q.from || q.to
          ? {
              expenseDate: {
                ...(q.from ? { gte: new Date(q.from) } : {}),
                ...(q.to ? { lte: new Date(q.to) } : {})
              }
            }
          : {}),
        ...(q.category ? { category: { slug: q.category } } : {}),
        ...(q.tag ? { tags: { has: q.tag } } : {}),
        ...(q.wallet ? { wallet: q.wallet } : {}),
        ...(q.status === "REVIEW_QUEUE"
          ? { status: { in: ["PENDING_REVIEW", "UNPARSED"] } }
          : q.status
            ? { status: q.status as any }
            : {}),
        ...(q.q
          ? {
              OR: [
                { id: { contains: q.q, mode: "insensitive" } },
                { description: { contains: q.q, mode: "insensitive" } },
                { rawText: { contains: q.q, mode: "insensitive" } }
              ]
            }
          : {})
      };

      const expenses = await prisma.expense.findMany({
        where,
        select: {
          id: true,
          expenseDate: true,
          createdAt: true,
          amount: true,
          description: true,
          rawText: true,
          tags: true,
          wallet: true,
          status: true,
          category: {
            select: { id: true, name: true, slug: true }
          },
          telegramMessage: {
            select: { createdAt: true }
          }
        },
        orderBy: { expenseDate: "desc" },
        take: 200
      });

      return ok(
        expenses.map((e) => ({
          id: e.id,
          expenseDate: e.expenseDate.toISOString(),
          receivedAt: (e.telegramMessage?.createdAt ?? e.createdAt).toISOString(),
          amount: Number(e.amount),
          description: e.description,
          rawText: e.rawText,
          tags: e.tags,
          wallet: e.wallet,
          status: e.status,
          category: e.category
            ? { id: e.category.id, name: e.category.name, slug: e.category.slug }
            : null
        }))
      );
    });
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Failed to fetch expenses");
  }
}

export async function POST(req: Request) {
  try {
    return await withUser(async (user) => {
      const body = await req.json().catch(() => null);
      const parsed = expenseCreateSchema.safeParse(body);
      if (!parsed.success) return errorResponse(400, "Invalid payload", parsed.error.flatten());

      const expense = await prisma.expense.create({
        data: {
          userId: user.id,
          description: parsed.data.description,
          amount: parsed.data.amount,
          expenseDate: new Date(parsed.data.expenseDate),
          categoryId: parsed.data.categoryId ?? null,
          tags: parsed.data.tags ?? [],
          wallet: parsed.data.wallet ?? null,
          status: parsed.data.status ?? "CONFIRMED"
        }
      });

      return ok(
        {
          id: expense.id,
          amount: Number(expense.amount)
        },
        { status: 201 }
      );
    });
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Failed to create expense");
  }
}
