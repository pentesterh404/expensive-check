import { AppShell } from "@/components/AppShell";
import { CategoriesManager } from "@/components/CategoriesManager";
import { UserMenu } from "@/components/UserMenu";
import { demoCategories } from "@/lib/demo-data";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export default async function CategoriesPage() {
  const user = await getSessionUser();
  const dbCategories = user
    ? await prisma.category.findMany({
        where: { userId: user.id },
        orderBy: { name: "asc" }
      })
    : [];

  const categories = (user ? dbCategories : demoCategories).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    color: c.color ?? null,
    icon: c.icon ?? null
  }));

  return (
    <AppShell showTopbar={false}>
      <div className="page">
        <section className="hero">
          <div className="hero-head">
            <div>
              <h1>Categories</h1>
              <p>Create and delete categories used for parser mapping and reporting.</p>
            </div>
            <UserMenu user={user} />
          </div>
        </section>
        <CategoriesManager categories={categories} />
      </div>
    </AppShell>
  );
}
