import { Router } from "express";
import type { Prisma } from "@prisma/client";
import type { CustomerSearchResponse } from "@riptacrm/shared-types";
import { prisma } from "../db";
import { toCustomerDetail, toCustomerSummary } from "../lib/mappers";

export const customersRouter = Router();

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
