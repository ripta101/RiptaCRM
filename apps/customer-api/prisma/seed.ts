import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

async function main() {
  await prisma.interactionHistory.deleteMany();
  await prisma.customer.deleteMany();

  await prisma.customer.create({
    data: {
      firstName: "Ripta",
      lastName: "Ramelan",
      phone: "0477707254",
      dateOfBirth: new Date("1990-05-05T00:00:00.000Z"),
      email: "ripta.ramelan@gmail.com",
      accountId: "ACC-1001",
      companyName: "Ripta Consulting",
      interactions: {
        create: [
          {
            channel: "phone",
            summary: "Called to ask about card replacement timeline.",
            occurredAt: new Date("2026-07-10T09:10:00.000Z"),
          },
          {
            channel: "email",
            summary: "Sent confirmation of updated mailing address.",
            occurredAt: new Date("2026-06-02T13:35:00.000Z"),
          },
          {
            channel: "webchat",
            summary: "Asked about statement download availability.",
            occurredAt: new Date("2026-05-18T11:05:00.000Z"),
          },
        ],
      },
    },
  });

  await prisma.customer.create({
    data: {
      firstName: "Ripta",
      lastName: "Sombono",
      phone: "0411222333",
      dateOfBirth: new Date("1985-02-20T00:00:00.000Z"),
      email: null,
      accountId: "ACC-1002",
      companyName: null,
    },
  });

  await prisma.customer.create({
    data: {
      firstName: "John",
      lastName: "Smith",
      phone: "0400111222",
      dateOfBirth: new Date("1978-11-03T00:00:00.000Z"),
      email: "john.smith@example.com",
      accountId: "ACC-1003",
      companyName: "Smith & Co",
      interactions: {
        create: [
          {
            channel: "phone",
            summary: "Raised a query about a duplicate charge.",
            occurredAt: new Date("2026-07-01T09:55:00.000Z"),
          },
        ],
      },
    },
  });

  await prisma.customer.create({
    data: {
      firstName: "Jane",
      lastName: "Doe",
      phone: "0400111223",
      dateOfBirth: new Date("1992-07-15T00:00:00.000Z"),
      email: "jane.doe@example.com",
      accountId: "ACC-1004",
      companyName: null,
    },
  });

  await prisma.customer.create({
    data: {
      firstName: "Amit",
      lastName: "Patel",
      phone: "0455998877",
      dateOfBirth: new Date("1988-01-10T00:00:00.000Z"),
      email: "amit.patel@example.com",
      accountId: "ACC-1005",
      companyName: "Patel Trading",
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
