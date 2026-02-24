import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const demoPasswordHash = await bcrypt.hash("demo1234", 10);
  const adminPasswordHash = await bcrypt.hash("nvthadmin", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {
      passwordHash: demoPasswordHash,
      displayName: "Demo User"
    },
    create: {
      email: "demo@example.com",
      passwordHash: demoPasswordHash,
      displayName: "Demo User"
    }
  });

  await prisma.user.upsert({
    where: { email: "admin@nvth.com" },
    update: {
      passwordHash: adminPasswordHash,
      displayName: "NVTH Admin"
    },
    create: {
      email: "admin@nvth.com",
      passwordHash: adminPasswordHash,
      displayName: "NVTH Admin"
    }
  });

  const defaults = [
    { name: "Food", slug: "food", color: "#d56f36" },
    { name: "Cafe", slug: "cafe", color: "#8f5c2c" },
    { name: "Transport", slug: "transport", color: "#225a43" },
    { name: "Shopping", slug: "shopping", color: "#a83f2f" }
  ];

  for (const c of defaults) {
    await prisma.category.upsert({
      where: { userId_slug: { userId: user.id, slug: c.slug } },
      update: { name: c.name, color: c.color },
      create: { userId: user.id, ...c }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
