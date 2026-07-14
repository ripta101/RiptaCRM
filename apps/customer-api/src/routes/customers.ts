import { Router } from "express";
import { Prisma } from "@prisma/client";
import type { CreateCustomerInput, CustomerSearchResponse } from "@riptacrm/shared-types";
import { prisma } from "../db";
import { toCustomerDetail, toCustomerSummary } from "../lib/mappers";

export const customersRouter = Router();

const REQUIRED_CREATE_FIELDS = ["firstName", "lastName", "phone", "dateOfBirth"] as const;

async function generateNextAccountId(): Promise<string> {
  const existing = await prisma.customer.findMany({
    where: { accountId: { startsWith: "ACC-" } },
    select: { accountId: true },
  });

  let maxNumber = 1000;
  for (const { accountId } of existing) {
    const match = accountId.match(/^ACC-(\d+)$/);
    if (match) {
      maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
    }
  }

  return `ACC-${maxNumber + 1}`;
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

const CONTAINS_FIELDS = [
  "firstName",
  "lastName",
  "phone",
  "email",
  "accountId",
  "companyName",
] as const;

customersRouter.get("/search", async (req, res) => {
  const query = req.query as Record<string, string | undefined>;

  const where: Prisma.CustomerWhereInput = {};
  let filterCount = 0;

  for (const field of CONTAINS_FIELDS) {
    const value = query[field]?.trim();
    if (value) {
      where[field] = { contains: value };
      filterCount++;
    }
  }

  const dateOfBirth = query.dateOfBirth?.trim();
  if (dateOfBirth) {
    const start = new Date(`${dateOfBirth}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ error: "Invalid dateOfBirth. Expected YYYY-MM-DD." });
    }
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    where.dateOfBirth = { gte: start, lt: end };
    filterCount++;
  }

  if (filterCount === 0) {
    return res.status(400).json({ error: "At least one search field is required." });
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const response: CustomerSearchResponse = { results: customers.map(toCustomerSummary) };
  res.json(response);
});

customersRouter.get("/:id", async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      cases: { orderBy: { openedAt: "desc" } },
      interactions: { orderBy: { occurredAt: "desc" } },
    },
  });

  if (!customer) {
    return res.status(404).json({ error: "Customer not found." });
  }

  res.json(toCustomerDetail(customer));
});

customersRouter.post("/", async (req, res) => {
  const body = req.body as Partial<CreateCustomerInput>;

  const missing = REQUIRED_CREATE_FIELDS.filter((field) => !body[field]?.toString().trim());
  if (missing.length > 0) {
    return res.status(400).json({ error: `Missing required field(s): ${missing.join(", ")}` });
  }

  const dateOfBirth = new Date(`${body.dateOfBirth}T00:00:00.000Z`);
  if (Number.isNaN(dateOfBirth.getTime())) {
    return res.status(400).json({ error: "Invalid dateOfBirth. Expected YYYY-MM-DD." });
  }

  const data = {
    firstName: body.firstName!.trim(),
    lastName: body.lastName!.trim(),
    phone: body.phone!.trim(),
    dateOfBirth,
    email: body.email?.trim() || null,
    companyName: body.companyName?.trim() || null,
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const accountId = await generateNextAccountId();
    try {
      const customer = await prisma.customer.create({ data: { ...data, accountId } });
      return res.status(201).json(toCustomerDetail({ ...customer, cases: [], interactions: [] }));
    } catch (err) {
      if (isUniqueConstraintError(err) && attempt < 2) continue;
      throw err;
    }
  }
});
