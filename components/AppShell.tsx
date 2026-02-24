import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { getSessionUser } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/auth/roles";
import { UserMenu } from "@/components/UserMenu";

export async function AppShell({
  children,
  showTopbar = true
}: {
  children: ReactNode;
  showTopbar?: boolean;
}) {
  const user = await getSessionUser();
  const isAdmin = isAdminEmail(user?.email);

  return (
    <div className="app-shell">
      <AppNav isAdmin={isAdmin} />
      <main className="main">
        {showTopbar ? (
          <div className="topbar">
            <div />
            <UserMenu user={user} />
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
