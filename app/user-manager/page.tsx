import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { UserManagerPanel } from "@/components/UserManagerPanel";
import { getSessionUser } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/auth/roles";
import { prisma } from "@/lib/db";

export default async function UserManagerPage() {
  const user = await getSessionUser();
  if (!isAdminEmail(user?.email)) {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      displayName: true,
      createdAt: true
    }
  });

  return (
    <AppShell
      showTopbar={true}
      title="User Management"
      subtitle="Admin access control and auditing"
    >
      <div className="page" style={{ gap: 20 }}>
        <UserManagerPanel
          users={users.map((u) => ({
            ...u,
            createdAt: u.createdAt.toISOString(),
            role: isAdminEmail(u.email) ? "ADMIN" : "USER"
          }))}
          currentAdminId={user!.id}
        />
      </div>
    </AppShell>
  );
}
