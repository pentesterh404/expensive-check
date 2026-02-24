export const ADMIN_EMAIL = "admin@nvth.com";

export function isAdminEmail(email?: string | null) {
  return (email ?? "").toLowerCase() === ADMIN_EMAIL;
}

