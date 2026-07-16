import { PrismaClient } from "../generated/prisma";
import { hashPassword } from "../src/lib/passwords";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: {
      id: "user-1",
      username: "test",
      passwordHash: await hashPassword("Passw0rd154@"),
      name: "Test User",
      email: "test@riptacrm.example",
      role: "frontline",
    },
  });

  await prisma.user.create({
    data: {
      id: "user-2",
      username: "admin",
      passwordHash: await hashPassword("Passw0rd154@"),
      name: "Admin User",
      email: "admin@riptacrm.example",
      role: "admin",
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
