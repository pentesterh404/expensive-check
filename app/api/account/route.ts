import { prisma } from "@/lib/db";
import { errorResponse, ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { accountProfilePatchSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(user);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return errorResponse(401, "Unauthorized");
    }
    return errorResponse(500, "Failed to load account");
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = accountProfilePatchSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, "Invalid payload", parsed.error.flatten());

    const data: Record<string, unknown> = {};
    if (parsed.data.displayName !== undefined) data.displayName = parsed.data.displayName;
    if (parsed.data.password) data.passwordHash = await hashPassword(parsed.data.password);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: { id: true, email: true, displayName: true }
    });

    return ok(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return errorResponse(401, "Unauthorized");
    }
    console.error(error);
    return errorResponse(500, "Failed to update account");
  }
}
