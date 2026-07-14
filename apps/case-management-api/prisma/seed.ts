import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

function emailConfig(config: {
  subjectTemplate: string;
  bodyTemplate: string;
  recipientMode: "CASE_CONTACT" | "STATIC";
  recipientValue?: string;
}): string {
  return JSON.stringify(config);
}

async function main() {
  await prisma.actionLogEntry.deleteMany();
  await prisma.caseStageHistory.deleteMany();
  await prisma.caseFieldValue.deleteMany();
  await prisma.caseInstance.deleteMany();
  await prisma.actionDefinition.deleteMany();
  await prisma.stageDefinition.deleteMany();
  await prisma.fieldDefinition.deleteMany();
  await prisma.caseTypeVersion.deleteMany();
  await prisma.caseType.deleteMany();

  const now = new Date();

  const complaint = await prisma.caseType.create({
    data: {
      key: "complaint",
      name: "Complaint",
      description: "A customer complaint that needs to be investigated and resolved.",
      versions: {
        create: [
          {
            versionNumber: 1,
            status: "PUBLISHED",
            publishedAt: now,
            fields: {
              create: [
                {
                  fieldKey: "description",
                  name: "Description",
                  fieldType: "TEXTAREA",
                  required: true,
                  displayOrder: 0,
                },
                {
                  fieldKey: "channel",
                  name: "Channel",
                  fieldType: "SELECT",
                  required: true,
                  optionsJson: JSON.stringify(["Phone", "Email", "In Person"]),
                  displayOrder: 1,
                },
                {
                  fieldKey: "amountDisputed",
                  name: "Amount Disputed",
                  fieldType: "NUMBER",
                  required: false,
                  displayOrder: 2,
                },
              ],
            },
            stages: {
              create: [
                {
                  key: "new",
                  name: "New",
                  slaMinutes: 60,
                  displayOrder: 0,
                  actions: {
                    create: [
                      {
                        trigger: "BEFORE_BREACH",
                        offsetMinutes: 15,
                        configJson: emailConfig({
                          subjectTemplate: "Reminder: Complaint {{caseId}} approaching SLA in {{stageName}}",
                          bodyTemplate:
                            "Case {{caseId}} in stage {{stageName}} is due by {{dueAt}}. Please review before it breaches.",
                          recipientMode: "STATIC",
                          recipientValue: "triage@example.com",
                        }),
                      },
                      {
                        trigger: "AT_BREACH",
                        offsetMinutes: 0,
                        configJson: emailConfig({
                          subjectTemplate: "SLA breached: Complaint {{caseId}}",
                          bodyTemplate:
                            "Case {{caseId}} has breached its SLA in stage {{stageName}} (due {{dueAt}}).",
                          recipientMode: "CASE_CONTACT",
                        }),
                      },
                      {
                        trigger: "AFTER_BREACH",
                        offsetMinutes: 30,
                        configJson: emailConfig({
                          subjectTemplate: "Escalation: Complaint {{caseId}} SLA breach unresolved",
                          bodyTemplate:
                            "Case {{caseId}} remains unresolved 30 minutes past its SLA due time ({{dueAt}}) in stage {{stageName}}. Escalating.",
                          recipientMode: "STATIC",
                          recipientValue: "escalations@example.com",
                        }),
                      },
                    ],
                  },
                },
                {
                  key: "investigating",
                  name: "Investigating",
                  slaMinutes: 1440,
                  displayOrder: 1,
                  actions: {
                    create: [
                      {
                        trigger: "AT_BREACH",
                        offsetMinutes: 0,
                        configJson: emailConfig({
                          subjectTemplate: "SLA breached: Complaint {{caseId}} in Investigating",
                          bodyTemplate: "Case {{caseId}} has breached its SLA while in stage {{stageName}}.",
                          recipientMode: "STATIC",
                          recipientValue: "case-manager@example.com",
                        }),
                      },
                    ],
                  },
                },
                {
                  key: "resolved",
                  name: "Resolved",
                  slaMinutes: 2880,
                  displayOrder: 2,
                },
                {
                  key: "closed",
                  name: "Closed",
                  slaMinutes: 0,
                  isTerminal: true,
                  displayOrder: 3,
                },
              ],
            },
          },
        ],
      },
    },
    include: { versions: { include: { stages: true } } },
  });

  await prisma.caseType.create({
    data: {
      key: "service-request",
      name: "Service Request",
      description: "A general request for IT or account service.",
      versions: {
        create: [
          {
            versionNumber: 1,
            status: "PUBLISHED",
            publishedAt: now,
            fields: {
              create: [
                {
                  fieldKey: "requestType",
                  name: "Request Type",
                  fieldType: "SELECT",
                  required: true,
                  optionsJson: JSON.stringify(["Password Reset", "Hardware", "Access Request"]),
                  displayOrder: 0,
                },
                {
                  fieldKey: "details",
                  name: "Details",
                  fieldType: "TEXTAREA",
                  required: false,
                  displayOrder: 1,
                },
              ],
            },
            stages: {
              create: [
                {
                  key: "open",
                  name: "Open",
                  slaMinutes: 30,
                  displayOrder: 0,
                  actions: {
                    create: [
                      {
                        trigger: "AT_BREACH",
                        offsetMinutes: 0,
                        configJson: emailConfig({
                          subjectTemplate: "SLA breached: Service Request {{caseId}}",
                          bodyTemplate: "Case {{caseId}} has breached its SLA in stage {{stageName}}.",
                          recipientMode: "STATIC",
                          recipientValue: "helpdesk@example.com",
                        }),
                      },
                    ],
                  },
                },
                {
                  key: "in-progress",
                  name: "In Progress",
                  slaMinutes: 480,
                  displayOrder: 1,
                },
                {
                  key: "completed",
                  name: "Completed",
                  slaMinutes: 0,
                  isTerminal: true,
                  displayOrder: 2,
                },
              ],
            },
          },
        ],
      },
    },
  });

  const complaintVersion = complaint.versions[0];
  const investigatingStage = complaintVersion.stages.find((s) => s.key === "investigating")!;
  const descriptionField = await prisma.fieldDefinition.findFirstOrThrow({
    where: { caseTypeVersionId: complaintVersion.id, fieldKey: "description" },
  });
  const channelField = await prisma.fieldDefinition.findFirstOrThrow({
    where: { caseTypeVersionId: complaintVersion.id, fieldKey: "channel" },
  });

  const enteredInvestigatingAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  await prisma.caseInstance.create({
    data: {
      caseTypeId: complaint.id,
      caseTypeVersionId: complaintVersion.id,
      currentStageId: investigatingStage.id,
      customerAccountId: "ACC-1001",
      assignedToUserId: "user-1",
      contactEmail: "ripta.ramelan@gmail.com",
      createdAt: enteredInvestigatingAt,
      stageHistory: {
        create: [
          {
            stageId: investigatingStage.id,
            enteredAt: enteredInvestigatingAt,
            slaDueAt: new Date(enteredInvestigatingAt.getTime() + investigatingStage.slaMinutes * 60 * 1000),
          },
        ],
      },
      fieldValues: {
        create: [
          { fieldDefinitionId: descriptionField.id, valueText: "Card replacement request stuck in review." },
          { fieldDefinitionId: channelField.id, valueText: "Phone" },
        ],
      },
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
