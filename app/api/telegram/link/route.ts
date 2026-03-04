import crypto from "node:crypto";
import { withUser } from "@/lib/api/with-auth";
import { errorResponse, ok } from "@/lib/api/response";
import { prisma } from "@/lib/db";
import { isDebugEnabled } from "@/lib/debug";
import { isAdminEmail } from "@/lib/auth/roles";
import { sendTelegramBotMessage } from "@/lib/telegram";

export async function GET(req: Request) {
  try {
    return await withUser(async (user) => {
      const debug = isAdminEmail(user.email) ? isDebugEnabled(req) : false;
      const linked = await prisma.telegramIdentity.findFirst({
        where: { userId: user.id },
        orderBy: { linkedAt: "desc" },
        select: {
          telegramUserId: true,
          telegramChatId: true,
          username: true,
          linkedAt: true
        }
      });

      return ok({
        linked: Boolean(linked),
        telegram_user_id: linked?.telegramUserId?.toString() ?? null,
        telegram_chat_id: linked?.telegramChatId?.toString() ?? null,
        username: linked?.username ?? null,
        linked_at: linked?.linkedAt?.toISOString() ?? null,
        debug_enabled: debug
      });
    });
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Failed to fetch Telegram link status");
  }
}

export async function POST(req: Request) {
  try {
    return await withUser(async (user) => {
      const debug = isAdminEmail(user.email) ? isDebugEnabled(req) : false;
      const code = crypto.randomBytes(4).toString("hex").toUpperCase();
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

      await prisma.telegramLinkCode.create({
        data: {
          userId: user.id,
          code,
          expiresAt
        }
      });

      return ok({ code, expires_at: expiresAt.toISOString(), debug_enabled: debug }, { status: 201 });
    });
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Failed to create link code");
  }
}

export async function DELETE(req: Request) {
  try {
    return await withUser(async (user) => {
      const debug = isAdminEmail(user.email) ? isDebugEnabled(req) : false;
      const identities = await prisma.telegramIdentity.findMany({
        where: { userId: user.id },
        select: { id: true, telegramUserId: true, telegramChatId: true }
      });
      const telegramUserIds = identities.map((item) => item.telegramUserId);
      const chatIds = Array.from(
        new Set(
          identities
        .map((item) => item.telegramChatId)
        .filter((value): value is bigint => value !== null)
        .map((value) => Number(value))
        .filter((value) => Number.isSafeInteger(value))
        )
      );

      const result = await prisma.$transaction(async (tx) => {
        const deletedIdentities = await tx.telegramIdentity.deleteMany({
          where: { userId: user.id }
        });
        const revokedCodes = await tx.telegramLinkCode.deleteMany({
          where: { userId: user.id, usedAt: null }
        });
        const detachedMessages =
          telegramUserIds.length > 0
            ? await tx.telegramMessage.updateMany({
                where: { userId: user.id, telegramUserId: { in: telegramUserIds } },
                data: { userId: null }
              })
            : { count: 0 };

        return {
          identities_deleted: deletedIdentities.count,
          pending_codes_deleted: revokedCodes.count,
          messages_detached: detachedMessages.count
        };
      });

      if (chatIds.length > 0) {
        await Promise.all(
          chatIds.map(async (chatId) => {
            const sent = await sendTelegramBotMessage(
              chatId,
              "Tai khoan Telegram da duoc unlink khoi web app. Neu can, hay tao ma va /link lai."
            );
            if (!sent.sent) {
              console.error("[telegram:link] failed to send unlink notice", {
                reason: sent.reason,
                chatId
              });
            }
          })
        );
      }

      return ok({ unlinked: true, ...result, debug_enabled: debug });
    });
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Failed to unlink Telegram account");
  }
}
