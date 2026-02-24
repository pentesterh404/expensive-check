import { errorResponse, ok } from "@/lib/api/response";
import { ingestTelegramUpdate, sendTelegramBotMessage } from "@/lib/telegram";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  context: { params: Promise<{ secret: string }> }
) {
  const { secret } = await context.params;
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return errorResponse(401, "Invalid webhook secret");
  }

  const body = await req.json().catch(() => null);
  if (!body || (typeof body !== "object")) return errorResponse(400, "Invalid Telegram update");

  const maybeText = (body as { message?: { text?: string }; edited_message?: { text?: string } }).message?.text
    ?? (body as { edited_message?: { text?: string } }).edited_message?.text;

  if (typeof maybeText === "string" && maybeText.startsWith("/link ")) {
    const code = maybeText.slice(6).trim().toUpperCase();
    const msg = (body as { message?: { from?: { id?: number; username?: string }; chat?: { id?: number } } }).message;
    if (msg?.from?.id) {
      const link = await prisma.telegramLinkCode.findFirst({
        where: {
          code,
          usedAt: null,
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: "desc" }
      });

      if (link) {
        await prisma.$transaction([
          prisma.telegramIdentity.upsert({
            where: { telegramUserId: BigInt(msg.from.id) },
            update: {
              userId: link.userId,
              telegramChatId: msg.chat?.id ? BigInt(msg.chat.id) : null,
              username: msg.from.username ?? null
            },
            create: {
              userId: link.userId,
              telegramUserId: BigInt(msg.from.id),
              telegramChatId: msg.chat?.id ? BigInt(msg.chat.id) : null,
              username: msg.from.username ?? null
            }
          }),
          prisma.telegramLinkCode.update({
            where: { id: link.id },
            data: { usedAt: new Date() }
          })
        ]);
        if (msg.chat?.id) {
          await sendTelegramBotMessage(msg.chat.id, "Liên kết tài khoản thành công.");
        }
        return ok({ ok: true, result: { handled: true, linked: true, command: "link" } });
      }
    }

    if (msg?.chat?.id) {
      await sendTelegramBotMessage(msg.chat.id, "Mã liên kết không hợp lệ hoặc đã hết hạn.");
    }

    return ok({
      ok: true,
      result: { handled: true, linked: false, command: "link", reason: "Invalid or expired code" }
    });
  }

  const result = await ingestTelegramUpdate(body as never);
  if ("chatId" in result && typeof result.chatId === "number" && "replyText" in result) {
    await sendTelegramBotMessage(result.chatId, String(result.replyText));
  }
  return ok({ ok: true, result });
}
