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

  const extraFrontlinePasswordHash = await hashPassword("Passw0rd154@");
  for (let n = 1; n <= 10; n++) {
    await prisma.user.create({
      data: {
        id: `user-frontline-${n}`,
        username: `test${n}`,
        passwordHash: extraFrontlinePasswordHash,
        name: `Test User ${n}`,
        email: `test${n}@riptacrm.example`,
        role: "frontline",
      },
    });
  }
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
