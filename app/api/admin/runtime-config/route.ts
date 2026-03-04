import { errorResponse, ok } from "@/lib/api/response";
import { requireAdminUser } from "@/lib/auth/session";
import { getRuntimeConfig, updateRuntimeConfig } from "@/lib/server/runtime-config";

type RuntimeConfigPayload = {
  NEXT_PUBLIC_BASE_URL?: string;
  TELEGRAM_BOT_USERNAME?: string;
  TELEGRAM_BOT_TOKEN?: string;
};

export async function GET() {
  try {
    await requireAdminUser();
    return ok(getRuntimeConfig());
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return errorResponse(401, "Unauthorized");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return errorResponse(403, "Admin only");
    }
    console.error(error);
    return errorResponse(500, "Failed to load runtime config");
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdminUser();

    const body = (await req.json().catch(() => null)) as RuntimeConfigPayload | null;
    if (!body || typeof body !== "object") {
      return errorResponse(400, "Invalid payload");
    }

    const updates: RuntimeConfigPayload = {};
    if (typeof body.NEXT_PUBLIC_BASE_URL === "string") {
      updates.NEXT_PUBLIC_BASE_URL = body.NEXT_PUBLIC_BASE_URL.trim();
    }
    if (typeof body.TELEGRAM_BOT_USERNAME === "string") {
      updates.TELEGRAM_BOT_USERNAME = body.TELEGRAM_BOT_USERNAME.replace(/^@/, "").trim();
    }
    if (typeof body.TELEGRAM_BOT_TOKEN === "string") {
      updates.TELEGRAM_BOT_TOKEN = body.TELEGRAM_BOT_TOKEN.trim();
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse(400, "No valid fields to update");
    }

    const saved = await updateRuntimeConfig(updates);
    return ok(saved);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return errorResponse(401, "Unauthorized");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return errorResponse(403, "Admin only");
    }
    console.error(error);
    return errorResponse(500, "Failed to update runtime config");
  }
}
