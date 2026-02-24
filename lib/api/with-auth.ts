import { errorResponse } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";

export async function withUser<T>(
  handler: (user: Awaited<ReturnType<typeof requireUser>>) => Promise<T>
) {
  try {
    const user = await requireUser();
    return await handler(user);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return errorResponse(401, "Unauthorized");
    }
    throw error;
  }
}
