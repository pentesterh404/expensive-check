import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AccountProfileForm } from "@/components/AccountProfileForm";
import { getSessionUser } from "@/lib/auth/session";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell
      showTopbar={true}
      title="Account Settings"
      subtitle="Manage your identity and security"
    >
      <div className="page" style={{ gap: 20 }}>
        <AccountProfileForm user={user} />
      </div>
    </AppShell>
  );
}
