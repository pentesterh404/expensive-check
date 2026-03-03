import { prisma } from "@/lib/db";
import { parseExpenseMessage } from "@/lib/parser/expense-parser";

interface TelegramMessageLike {
  message_id: number;
  date?: number;
  text?: string;
  chat?: { id: number };
  from?: { id?: number; username?: string };
}

interface TelegramUpdate {
  update_id?: number;
  message?: TelegramMessageLike;
  edited_message?: TelegramMessageLike;
}

function formatAmountCompactVnd(amount: number) {
  if (!Number.isFinite(amount)) return "0";
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

export async function sendTelegramBotMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { sent: false, reason: "Missing TELEGRAM_BOT_TOKEN" } as const;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text
      })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { sent: false, reason: `Telegram API ${res.status}: ${body}` } as const;
    }
    return { sent: true } as const;
  } catch (error) {
    return { sent: false, reason: error instanceof Error ? error.message : "Unknown error" } as const;
  }
}

export function extractTelegramMessage(update: TelegramUpdate): TelegramMessageLike | null {
  return update.message ?? update.edited_message ?? null;
}

export async function ingestTelegramUpdate(update: TelegramUpdate) {
  const msg = extractTelegramMessage(update);
  if (!msg?.chat?.id || !msg.message_id) {
    return { handled: false, reason: "Unsupported update" } as const;
  }

  const rawText = msg.text ?? "";
  const parsed = parseExpenseMessage(rawText);
  const rawUpdatePayload = JSON.parse(JSON.stringify(update)) as object;
  const parsedPayload = {
    ...parsed,
    expenseDate: parsed.expenseDate ? parsed.expenseDate.toISOString() : null
  };
  const existingIdentity = msg.from?.id
    ? await prisma.telegramIdentity.findUnique({
        where: { telegramUserId: BigInt(msg.from.id) }
      })
    : null;

  const telegramMessage = await prisma.telegramMessage.upsert({
    where: {
      chatId_messageId: {
        chatId: BigInt(msg.chat.id),
        messageId: msg.message_id
      }
    },
    update: {
      userId: existingIdentity?.userId,
      telegramUserId: msg.from?.id ? BigInt(msg.from.id) : null,
      rawUpdate: rawUpdatePayload,
      rawText,
      parsedPayload
    },
    create: {
      userId: existingIdentity?.userId,
      chatId: BigInt(msg.chat.id),
      messageId: msg.message_id,
      telegramUserId: msg.from?.id ? BigInt(msg.from.id) : null,
      rawUpdate: rawUpdatePayload,
      rawText,
      parsedPayload
    }
  });

  if (!existingIdentity?.userId) {
    return { handled: true, linked: false, messageId: telegramMessage.id } as const;
  }

  const category = parsed.detectedCategorySlug
    ? await prisma.category.findFirst({
        where: {
          userId: existingIdentity.userId,
          slug: parsed.detectedCategorySlug
        }
      })
    : null;
  const hasUnknownTaggedCategory = parsed.tags.length > 0 && !category;
  const finalStatus =
    parsed.amount && hasUnknownTaggedCategory ? "PENDING_REVIEW" : parsed.status;

  const expenseDate = parsed.expenseDate ?? new Date((msg.date ?? Date.now() / 1000) * 1000);
  const description = parsed.description || rawText || "Telegram expense";

  const expense = await prisma.expense.upsert({
    where: { telegramMessageId: telegramMessage.id },
    update: {
      userId: existingIdentity.userId,
      categoryId: category?.id ?? null,
      expenseDate,
      amount: parsed.amount ?? 0,
      rawText,
      description,
      tags: parsed.tags,
      wallet: parsed.wallet,
      status: finalStatus
    },
    create: {
      userId: existingIdentity.userId,
      telegramMessageId: telegramMessage.id,
      categoryId: category?.id ?? null,
      expenseDate,
      amount: parsed.amount ?? 0,
      rawText,
      description,
      tags: parsed.tags,
      wallet: parsed.wallet,
      status: finalStatus
    }
  });

  const amountLabel = parsed.amount ? formatAmountCompactVnd(parsed.amount) : "0đ";
  const categoryName = category?.name ?? null;
  const replyText = parsed.amount
    ? categoryName
      ? `Đã thêm ${amountLabel} ${description} vào ${categoryName}`
      : hasUnknownTaggedCategory
        ? `Đã thêm ${amountLabel} ${description}. Tag chưa map category, đưa vào review queue`
        : `Đã thêm ${amountLabel} ${description}`
    : `Không parse được số tiền. Đã đưa vào review queue`;

  return {
    handled: true,
    linked: true,
    messageId: telegramMessage.id,
    expenseId: expense.id,
    expense: {
      amount: parsed.amount ?? 0,
      amountLabel,
      description,
      status: finalStatus,
      categoryName
    },
    chatId: msg.chat.id,
    replyText
  } as const;
}
