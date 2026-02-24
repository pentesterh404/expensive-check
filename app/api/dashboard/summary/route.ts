import { buildDashboardSummary } from "@/lib/dashboard";
import { withUser } from "@/lib/api/with-auth";
import { errorResponse, ok } from "@/lib/api/response";

export async function GET() {
  try {
    return await withUser(async (user) => {
      const summary = await buildDashboardSummary(user.id);
      return ok(summary);
    });
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Failed to load dashboard summary");
  }
}
