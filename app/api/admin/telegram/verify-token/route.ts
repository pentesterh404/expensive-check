import { ok, errorResponse } from "@/lib/api/response";
import { requireAdminUser } from "@/lib/auth/session";
import { getRuntimeConfig } from "@/lib/server/runtime-config";

export async function GET() {
  try {
    await requireAdminUser();

    const token = getRuntimeConfig().TELEGRAM_BOT_TOKEN?.trim();
    if (!token) {
      return errorResponse(400, "Missing TELEGRAM_BOT_TOKEN");
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      method: "GET",
      cache: "no-store"
    });
    const payload = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: {
        id?: number;
        is_bot?: boolean;
        first_name?: string;
        username?: string;
      };
      error_code?: number;
      description?: string;
    };

    if (!res.ok || !payload?.ok) {
      return errorResponse(502, "Telegram token verification failed", {
        telegram_status: res.status,
        telegram_error_code: payload?.error_code ?? null,
        telegram_description: payload?.description ?? "Unknown Telegram error"
      });
    }

    return ok({
      valid: true,
      bot: {
        id: payload.result?.id ?? null,
        username: payload.result?.username ?? null,
        first_name: payload.result?.first_name ?? null,
        is_bot: payload.result?.is_bot ?? true
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
    return errorResponse(500, "Failed to verify Telegram token");
  }
}
