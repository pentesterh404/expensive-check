import { prisma } from "@/lib/db";
import { withUser } from "@/lib/api/with-auth";
import { errorResponse, ok } from "@/lib/api/response";
import { categorySchema } from "@/lib/validation";

export async function GET() {
  try {
    return await withUser(async (user) => {
      const categories = await prisma.category.findMany({
        where: { userId: user.id },
        orderBy: { name: "asc" }
      });
      return ok(categories);
    });
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Failed to fetch categories");
  }
}

export async function POST(req: Request) {
  try {
    return await withUser(async (user) => {
      const body = await req.json().catch(() => null);
      const parsed = categorySchema.safeParse(body);
      if (!parsed.success) return errorResponse(400, "Invalid payload", parsed.error.flatten());

      const category = await prisma.category.create({
        data: { userId: user.id, ...parsed.data }
      });
      return ok(category, { status: 201 });
    });
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Failed to create category");
  }
}
