import { Router } from "express";
import { CUSTOMER_LODGE_CASE_FEATURE_ID, CUSTOMER_SEARCH_FEATURE_ID } from "@riptacrm/shared-types";
import type { CaseTypeSummary, CreateCaseInstanceInput } from "@riptacrm/shared-types";
import { requirePermission } from "../lib/requirePermission";

export const caseTypesRouter = Router();

const CASE_MANAGEMENT_API_URL = process.env.CASE_MANAGEMENT_API_URL ?? "http://localhost:4311";
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY ?? "dev-only-insecure-service-key-change-me";
const SERVICE_HEADERS = { "X-Internal-Service-Key": INTERNAL_SERVICE_KEY };

caseTypesRouter.get("/lodgeable-case-types", requirePermission(CUSTOMER_SEARCH_FEATURE_ID), async (_req, res) => {
  try {
    const upstream = await fetch(`${CASE_MANAGEMENT_API_URL}/api/case-types`, { headers: SERVICE_HEADERS });
    if (!upstream.ok) return res.json({ results: [] });
    const data: { results: CaseTypeSummary[] } = await upstream.json();
    const lodgeable = data.results.filter((ct) => ct.isActive && ct.publishedVersion !== null);
    res.json({ results: lodgeable });
  } catch (err) {
    console.error("Failed to fetch case types from case-management-api:", err);
    res.json({ results: [] });
  }
});

caseTypesRouter.get(
  "/case-type-versions/:versionId",
  requirePermission(CUSTOMER_SEARCH_FEATURE_ID),
  async (req, res) => {
    try {
      const upstream = await fetch(`${CASE_MANAGEMENT_API_URL}/api/case-type-versions/${req.params.versionId}`, {
        headers: SERVICE_HEADERS,
      });
      const body = await upstream.json().catch(() => null);
      res.status(upstream.status).json(body);
    } catch (err) {
      console.error("Failed to fetch case type version from case-management-api:", err);
      res.status(502).json({ error: "Case Management module is unreachable." });
    }
  },
);

caseTypesRouter.post("/case-instances", requirePermission(CUSTOMER_LODGE_CASE_FEATURE_ID), async (req, res) => {
  const body = req.body as CreateCaseInstanceInput;
  try {
    const upstream = await fetch(`${CASE_MANAGEMENT_API_URL}/api/case-instances`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...SERVICE_HEADERS },
      body: JSON.stringify(body),
    });
    const responseBody = await upstream.json().catch(() => null);
    res.status(upstream.status).json(responseBody);
  } catch (err) {
    console.error("Failed to create case instance via case-management-api:", err);
    res.status(502).json({ error: "Case Management module is unreachable." });
  }
});
