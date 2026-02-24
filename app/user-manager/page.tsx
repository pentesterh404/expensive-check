import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { UserManagerPanel } from "@/components/UserManagerPanel";
import { UserMenu } from "@/components/UserMenu";
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
    <AppShell showTopbar={false}>
      <div className="page">
        <section className="hero">
          <div className="hero-head">
            <div>
              <h1>User Manager</h1>
              <p>Admin-only screen to create, edit, and delete regular users.</p>
            </div>
            <UserMenu user={user} />
          </div>
        </section>
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
