import { AppShell } from "@/components/AppShell";
import { CategoriesManager } from "@/components/CategoriesManager";
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
    <AppShell
      showTopbar={true}
      title="Expense Categories"
      subtitle="Organize your spending structure"
    >
      <div className="page" style={{ gap: 20 }}>
        <CategoriesManager categories={categories} />
      </div>
    </AppShell>
  );
}
