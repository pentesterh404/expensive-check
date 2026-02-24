import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { errorResponse, ok } from "@/lib/api/response";
import { signAuthToken } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return errorResponse(400, "Invalid payload", parsed.error.flatten());

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return errorResponse(401, "Invalid credentials");

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return errorResponse(401, "Invalid credentials");

  const token = await signAuthToken({ userId: user.id, email: user.email });
  const cookieStore = await cookies();
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return ok({
    user: { id: user.id, email: user.email, displayName: user.displayName }
  });
}
