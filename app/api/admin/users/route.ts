import { prisma } from "@/lib/db";
import { errorResponse, ok } from "@/lib/api/response";
import { requireAdminUser } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/auth/roles";
import { hashPassword } from "@/lib/auth/password";
import { adminCreateUserSchema } from "@/lib/validation";
import { DEFAULT_USER_CATEGORIES } from "@/lib/default-categories";

export async function GET() {
  try {
    await requireAdminUser();
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true
      }
    });

    return ok(
      users.map((u) => ({
        ...u,
        role: isAdminEmail(u.email) ? "ADMIN" : "USER",
        createdAt: u.createdAt.toISOString()
      }))
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return errorResponse(401, "Unauthorized");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return errorResponse(403, "Admin only");
    }
    console.error(error);
    return errorResponse(500, "Failed to fetch users");
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminUser();
    const body = await req.json().catch(() => null);
    const parsed = adminCreateUserSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, "Invalid payload", parsed.error.flatten());

    if (isAdminEmail(parsed.data.email)) {
      return errorResponse(400, "Use seed for admin account");
    }

    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (exists) return errorResponse(409, "Email already exists");

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: parsed.data.email,
          displayName: parsed.data.displayName ?? null,
          passwordHash
        },
        select: { id: true, email: true, displayName: true, createdAt: true }
      });

      await tx.category.createMany({
        data: DEFAULT_USER_CATEGORIES.map((category) => ({
          userId: createdUser.id,
          name: category.name,
          slug: category.slug,
          color: category.color
        }))
      });

      return createdUser;
    });

    return ok(
      { ...user, role: "USER", createdAt: user.createdAt.toISOString() },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return errorResponse(401, "Unauthorized");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return errorResponse(403, "Admin only");
    }
    console.error(error);
    return errorResponse(500, "Failed to create user");
  }
}
