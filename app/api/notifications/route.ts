import { prisma } from "@/lib/db";
import { errorResponse, ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";

function formatAmountCompactVnd(amount: number) {
  if (!Number.isFinite(amount)) return "0đ";
  if (amount >= 1_000_000) {
    const tr = amount / 1_000_000;
    return Number.isInteger(tr) ? `${tr}tr` : `${tr.toFixed(1).replace(/\.0$/, "")}tr`;
  }
  if (amount >= 1_000) {
    const k = amount / 1_000;
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1).replace(/\.0$/, "")}k`;
  }
  return `${amount}đ`;
}

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const since = url.searchParams.get("since");
    const sinceDate = since ? new Date(since) : new Date(0);
    const safeSince = Number.isNaN(sinceDate.getTime()) ? new Date(0) : sinceDate;

    const unreadCount = await prisma.telegramMessage.count({
      where: {
        userId: user.id,
        createdAt: { gt: safeSince }
      }
    });

    const recent = await prisma.telegramMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        rawText: true,
        createdAt: true,
        expenses: {
          select: {
            id: true,
            amount: true,
            description: true,
            status: true,
            expenseDate: true,
            currency: true,
            tags: true,
            wallet: true,
            rawText: true,
            category: {
              select: { name: true }
            }
          },
          take: 1
        }
      }
    });

    const latestAt = recent[0]?.createdAt?.toISOString() ?? null;

    return ok({
      unreadCount,
      latestAt,
      items: recent.map((item) => ({
        message:
          item.expenses[0]
            ? (() => {
              const amountLabel = formatAmountCompactVnd(Number(item.expenses[0].amount));
              const desc = item.expenses[0].description ?? item.rawText ?? "";
              const categoryName = item.expenses[0].category?.name ?? null;
              return categoryName
                ? `Đã thêm ${amountLabel} ${desc} vào ${categoryName}`
                : `Đã thêm ${amountLabel} ${desc}`;
            })()
            : item.rawText ?? "Telegram message",
        id: item.id,
        text: item.rawText ?? "",
        createdAt: item.createdAt.toISOString(),
        expense:
          item.expenses[0]
            ? {
              id: item.expenses[0].id,
              amount: Number(item.expenses[0].amount),
              description: item.expenses[0].description,
              status: item.expenses[0].status,
              expenseDate: item.expenses[0].expenseDate.toISOString(),
              currency: item.expenses[0].currency,
              tags: item.expenses[0].tags,
              wallet: item.expenses[0].wallet,
              categoryName: item.expenses[0].category?.name ?? null,
              rawText: item.expenses[0].rawText
            }
            : null
      }))
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return errorResponse(401, "Unauthorized");
    }
    console.error(error);
    return errorResponse(500, "Failed to load notifications");
  }
}
