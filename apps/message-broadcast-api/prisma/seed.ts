import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

async function main() {
  await prisma.messageBroadcastTargetRole.deleteMany();
  await prisma.messageBroadcast.deleteMany();

  const now = new Date();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  await prisma.messageBroadcast.create({
    data: {
      title: "Welcome to RiptaCRM",
      bodyHtml: "<p>Thanks for logging in! 🎉 This is a <strong>high priority</strong> announcement visible to everyone.</p>",
      priority: 3,
      startAt: new Date(now.getTime() - hour),
      endAt: new Date(now.getTime() + 7 * day),
      targetRoles: { create: [{ role: "frontline" }, { role: "admin" }] },
    },
  });

  await prisma.messageBroadcast.create({
    data: {
      title: "New Worklist filters available",
      bodyHtml: "<p>You can now filter your Worklist by priority. Give it a try!</p>",
      priority: 0,
      startAt: new Date(now.getTime() - hour),
      endAt: new Date(now.getTime() + 3 * day),
      targetRoles: { create: [{ role: "frontline" }] },
    },
  });

  await prisma.messageBroadcast.create({
    data: {
      title: "Scheduled maintenance next week",
      bodyHtml: "<p>A short maintenance window is planned. Details to follow.</p>",
      priority: 2,
      startAt: new Date(now.getTime() + day),
      endAt: new Date(now.getTime() + 2 * day),
      targetRoles: { create: [{ role: "frontline" }, { role: "admin" }] },
    },
  });

  await prisma.messageBroadcast.create({
    data: {
      title: "Holiday hours (expired)",
      bodyHtml: "<p>This announcement has already expired and should not be visible.</p>",
      priority: 0,
      startAt: new Date(now.getTime() - 10 * day),
      endAt: new Date(now.getTime() - day),
      targetRoles: { create: [{ role: "frontline" }] },
    },
  });

  await prisma.messageBroadcast.create({
    data: {
      title: "Retracted announcement (canceled)",
      bodyHtml: "<p>This was canceled by an admin before it expired and should not be visible.</p>",
      priority: 1,
      startAt: new Date(now.getTime() - hour),
      endAt: new Date(now.getTime() + day),
      canceledAt: now,
      targetRoles: { create: [{ role: "admin" }] },
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
