import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

// User ids here must match apps/auth-api/prisma/seed.ts's User.id values — same trust
// model QueueMember.userId already has with auth-api (this service owns no User model).
const FRONTLINE_USER_IDS = ["user-1", ...Array.from({ length: 10 }, (_, i) => `user-frontline-${i + 1}`)];

async function main() {
  await prisma.profile.deleteMany();

  await prisma.profile.create({
    data: {
      id: "profile-business-admin",
      name: "Business Admin",
      isProtected: true,
      dashboardType: "admin",
      canStartInteractions: false,
      navItems: {
        create: [
          "home",
          "webchat-config",
          "email-config",
          "case-management-config",
          "broadcast-config",
          "access-management-config",
        ].map((navItemId) => ({ navItemId })),
      },
      members: { create: [{ userId: "user-2" }] },
    },
  });

  await prisma.profile.create({
    data: {
      id: "profile-frontline-user",
      name: "Frontline User",
      isProtected: false,
      dashboardType: "frontline",
      canStartInteractions: true,
      navItems: { create: ["home", "it-support"].map((navItemId) => ({ navItemId })) },
      members: { create: FRONTLINE_USER_IDS.map((userId) => ({ userId })) },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
