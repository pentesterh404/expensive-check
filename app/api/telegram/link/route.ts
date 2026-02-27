import crypto from "node:crypto";
import { withUser } from "@/lib/api/with-auth";
import { errorResponse, ok } from "@/lib/api/response";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    return await withUser(async (user) => {
      const code = crypto.randomBytes(4).toString("hex").toUpperCase();
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

      await prisma.telegramLinkCode.create({
        data: {
          userId: user.id,
          code,
          expiresAt
        }
      });

      return ok({ code, expires_at: expiresAt.toISOString() }, { status: 201 });
    });
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Failed to create link code");
  }
}
