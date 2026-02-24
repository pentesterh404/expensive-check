import { cookies } from "next/headers";
import { ok } from "@/lib/api/response";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set("auth_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return ok({ success: true });
}
