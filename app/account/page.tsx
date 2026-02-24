import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AccountProfileForm } from "@/components/AccountProfileForm";
import { UserMenu } from "@/components/UserMenu";
import { getSessionUser } from "@/lib/auth/session";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell showTopbar={false}>
      <div className="page">
        <section className="hero">
          <div className="hero-head">
            <div>
              <h1>Account Profile</h1>
              <p>Manage your display name, password, and account settings.</p>
            </div>
            <UserMenu user={user} />
          </div>
        </section>
        <AccountProfileForm user={user} />
      </div>
    </AppShell>
  );
}
