import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

// Fixed so the sample site's embed snippets (apps/webchat-sample-site) can hardcode it.
const DEMO_SITE_KEY = "demo-site-key-please-change";

// Must match auth-api's seeded user ids — this service has no User model of its own,
// same trust model QueueMember already has with auth-api in case-management-api.
const FRONTLINE_MEMBER_IDS = ["user-1", "user-frontline-1", "user-frontline-2"];

async function main() {
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.routingRule.deleteMany();
  await prisma.site.deleteMany();
  await prisma.webChatQueueMember.deleteMany();
  await prisma.agentCapacityOverride.deleteMany();
  await prisma.webChatQueue.deleteMany();
  await prisma.agentStatus.deleteMany();
  await prisma.agentStatusOption.deleteMany();

  await prisma.agentStatusOption.createMany({
    data: [
      { label: "Available", isAvailableForChats: true },
      { label: "Lunch", isAvailableForChats: false },
      { label: "Administration", isAvailableForChats: false },
    ],
  });

  const generalSupport = await prisma.webChatQueue.create({
    data: {
      // Fixed — nothing outside this service has ever needed to reference a WebChatQueue by
      // id before; access-management-api's seed grants this id as a Supervisor profile's
      // supervised queue and needs it to be deterministic across a fresh db:seed.
      id: "queue-general-support",
      name: "General Support",
      autoPopup: true,
      members: { create: FRONTLINE_MEMBER_IDS.map((userId) => ({ userId })) },
    },
  });

  const site = await prisma.site.create({
    data: {
      name: "RiptaCRM Demo Site",
      siteKey: DEMO_SITE_KEY,
      allowedOrigins: null, // demo only — accept any origin
      defaultQueueId: generalSupport.id,
      rules: {
        create: [
          {
            pattern: "/",
            matchType: "EXACT",
            priority: 0,
            autoReplyText: "Thanks for stopping by! An agent will be with you shortly.",
            targetQueueId: generalSupport.id,
          },
          {
            pattern: "/pricing.html",
            matchType: "PREFIX",
            priority: 0,
            autoReplyText: "Thanks for checking out our pricing — happy to answer any questions!",
            targetQueueId: generalSupport.id,
          },
          {
            pattern: "/support.html",
            matchType: "PREFIX",
            priority: 0,
            autoReplyText: "Thanks for reaching out to Support — an agent will be right with you.",
            targetQueueId: generalSupport.id,
          },
        ],
      },
    },
  });

  console.log(`Seeded demo Site "${site.name}" with siteKey="${site.siteKey}"`);
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
