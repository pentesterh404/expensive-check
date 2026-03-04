import { errorResponse, ok } from "@/lib/api/response";
import { ingestTelegramUpdate, sendTelegramBotMessage } from "@/lib/telegram";
import { prisma } from "@/lib/db";
import { isDebugEnabled } from "@/lib/debug";
import { getRuntimeConfig } from "@/lib/server/runtime-config";

function resolveSettingsUrl(req: Request) {
  const envBaseUrl = getRuntimeConfig().NEXT_PUBLIC_BASE_URL?.trim();
  if (envBaseUrl) {
    return `${envBaseUrl.replace(/\/+$/, "")}/settings`;
  }

  try {
    const url = new URL(req.url);
    return `${url.origin}/settings`;
  } catch {
    return "/settings";
  }
}

function parseLinkCode(rawText: string | null | undefined) {
  if (typeof rawText !== "string") return null;
  const text = rawText.trim();
  if (!text.toLowerCase().startsWith("/link")) return null;

  // Accept:
  // /link CODE
  // /link@bot_username CODE
  const match = text.match(/^\/link(?:@\w+)?(?:\s+([A-Za-z0-9]+))?$/i);
  if (!match) return { isLinkCommand: true, code: null as string | null };
  return { isLinkCommand: true, code: match[1]?.trim().toUpperCase() ?? null };
}

export async function POST(
  req: Request,
  context: { params: Promise<{ secret: string }> }
) {
  const debug = isDebugEnabled(req);
  const settingsUrl = resolveSettingsUrl(req);
  const { secret } = await context.params;
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return errorResponse(401, "Invalid webhook secret");
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return errorResponse(400, "Invalid Telegram update");
  if (debug) {
    console.log("[telegram:webhook] received update", {
      hasMessage: Boolean((body as { message?: unknown }).message),
      hasEditedMessage: Boolean((body as { edited_message?: unknown }).edited_message)
    });
  }

  const fallbackChatId =
    (body as { message?: { chat?: { id?: number } }; edited_message?: { chat?: { id?: number } } }).message?.chat
      ?.id ??
    (body as { edited_message?: { chat?: { id?: number } } }).edited_message?.chat?.id;

  const maybeText = (body as { message?: { text?: string }; edited_message?: { text?: string } }).message?.text
    ?? (body as { edited_message?: { text?: string } }).edited_message?.text;
  const linkCmd = parseLinkCode(maybeText);
  const incomingMsg = (body as {
    message?: { from?: { id?: number }; chat?: { id?: number } };
    edited_message?: { from?: { id?: number }; chat?: { id?: number } };
  }).message ??
  (body as { edited_message?: { from?: { id?: number }; chat?: { id?: number } } }).edited_message;

  if (linkCmd?.isLinkCommand) {
    const code = linkCmd.code;
    const msg = (body as { message?: { from?: { id?: number; username?: string }; chat?: { id?: number } } })
      .message;

    if (!code) {
      if (msg?.chat?.id) {
        await sendTelegramBotMessage(msg.chat.id, "Sai cu phap. Dung: /link CODE");
      }
      return ok({
        ok: true,
        result: { handled: true, linked: false, command: "link", reason: "Missing code", debug }
      });
    }

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
          const sent = await sendTelegramBotMessage(msg.chat.id, "Link tai khoan thanh cong.");
          if (!sent.sent) {
            console.error("[telegram:webhook] failed to send link success", {
              reason: sent.reason,
              chatId: msg.chat.id
            });
          }
        }

        return ok({ ok: true, result: { handled: true, linked: true, command: "link", debug } });
      }
    }

    if (msg?.chat?.id) {
      const sent = await sendTelegramBotMessage(
        msg.chat.id,
        "Ma link khong hop le hoac da het han. Tao ma moi trong Settings."
      );
      if (!sent.sent) {
        console.error("[telegram:webhook] failed to send link invalid message", {
          reason: sent.reason,
          chatId: msg.chat.id
        });
      }
    }

    return ok({
      ok: true,
      result: { handled: true, linked: false, command: "link", reason: "Invalid or expired code", debug }
    });
  }

  let unlinkedNoticeSent = false;
  if (incomingMsg?.from?.id && incomingMsg?.chat?.id) {
    const identity = await prisma.telegramIdentity.findUnique({
      where: { telegramUserId: BigInt(incomingMsg.from.id) },
      select: { telegramChatId: true }
    });
    const isLinkedChat =
      !!identity &&
      identity.telegramChatId !== null &&
      identity.telegramChatId === BigInt(incomingMsg.chat.id);
    if (!isLinkedChat) {
      const sent = await sendTelegramBotMessage(
        incomingMsg.chat.id,
        `Tai khoan chua duoc lien ket. Vui long lien ket tai: ${settingsUrl}`
      );
      unlinkedNoticeSent = sent.sent;
      if (!sent.sent) {
        console.error("[telegram:webhook] failed to send proactive unlinked hint", {
          reason: sent.reason,
          chatId: incomingMsg.chat.id
        });
      }
    }
  }

  const result = await ingestTelegramUpdate(body as never);
  if (debug) {
    console.log("[telegram:webhook] ingest result", result);
  }
  if ("chatId" in result && typeof result.chatId === "number" && "replyText" in result) {
    const sent = await sendTelegramBotMessage(result.chatId, String(result.replyText));
    if (!sent.sent) {
      console.error("[telegram:webhook] failed to send reply", {
        reason: sent.reason,
        chatId: result.chatId
      });
      await sendTelegramBotMessage(result.chatId, "Da nhan du lieu. Vui long kiem tra lai ket noi bot.");
    }
  } else if (
    "linked" in result &&
    result.linked === false &&
    typeof fallbackChatId === "number" &&
    !unlinkedNoticeSent
  ) {
    const sent = await sendTelegramBotMessage(
      fallbackChatId,
      `Tai khoan chua duoc lien ket. Vui long lien ket tai: ${settingsUrl}`
    );
    if (!sent.sent) {
      console.error("[telegram:webhook] failed to send unlinked hint", {
        reason: sent.reason,
        chatId: fallbackChatId
      });
    }
  }

  return ok({ ok: true, result, debug });
}
