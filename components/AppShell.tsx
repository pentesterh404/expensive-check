import type { ReactNode } from "react";
import { getSessionUser } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/auth/roles";
import { SidebarProvider } from "./SidebarProvider";
import { AppShellClient } from "./AppShellClient";

export async function AppShell(props: {
  children: ReactNode;
  showTopbar?: boolean;
  title?: string;
  subtitle?: string;
}) {
  try {
    const user = await getSessionUser();
    const isAdmin = isAdminEmail(user?.email);

    return (
      <SidebarProvider>
        <AppShellClient {...props} user={user} isAdmin={isAdmin} />
      </SidebarProvider>
    );
  } catch (err: any) {
    console.error(">>> APPSHELL_ERROR:", err);
    if (err?.stack) console.error(err.stack);
    throw err;
  }
}
