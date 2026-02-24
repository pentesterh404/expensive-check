import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { errorResponse, ok } from "@/lib/api/response";
import { hashPassword } from "@/lib/auth/password";
import { signAuthToken } from "@/lib/auth/jwt";
import { registerSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return errorResponse(400, "Invalid payload", parsed.error.flatten());

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return errorResponse(409, "Email already registered");

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      displayName: parsed.data.displayName,
      passwordHash: await hashPassword(parsed.data.password)
    },
    select: { id: true, email: true, displayName: true }
  });

  const token = await signAuthToken({ userId: user.id, email: user.email });
  const cookieStore = await cookies();
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return ok({ user });
}
