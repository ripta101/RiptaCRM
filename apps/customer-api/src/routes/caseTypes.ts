import { Router } from "express";
import type { CaseTypeSummary, CreateCaseInstanceInput } from "@riptacrm/shared-types";

export const caseTypesRouter = Router();

const CASE_MANAGEMENT_API_URL = process.env.CASE_MANAGEMENT_API_URL ?? "http://localhost:4311";

caseTypesRouter.get("/lodgeable-case-types", async (_req, res) => {
  try {
    const upstream = await fetch(`${CASE_MANAGEMENT_API_URL}/api/case-types`);
    if (!upstream.ok) return res.json({ results: [] });
    const data: { results: CaseTypeSummary[] } = await upstream.json();
    const lodgeable = data.results.filter((ct) => ct.isActive && ct.publishedVersion !== null);
    res.json({ results: lodgeable });
  } catch (err) {
    console.error("Failed to fetch case types from case-management-api:", err);
    res.json({ results: [] });
  }
});

caseTypesRouter.get("/case-type-versions/:versionId", async (req, res) => {
  try {
    const upstream = await fetch(`${CASE_MANAGEMENT_API_URL}/api/case-type-versions/${req.params.versionId}`);
    const body = await upstream.json().catch(() => null);
    res.status(upstream.status).json(body);
  } catch (err) {
    console.error("Failed to fetch case type version from case-management-api:", err);
    res.status(502).json({ error: "Case Management module is unreachable." });
  }
});

caseTypesRouter.post("/case-instances", async (req, res) => {
  const body = req.body as CreateCaseInstanceInput;
  try {
    const upstream = await fetch(`${CASE_MANAGEMENT_API_URL}/api/case-instances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const responseBody = await upstream.json().catch(() => null);
    res.status(upstream.status).json(responseBody);
  } catch (err) {
    console.error("Failed to create case instance via case-management-api:", err);
    res.status(502).json({ error: "Case Management module is unreachable." });
  }
});
