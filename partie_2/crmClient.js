import { createHash } from "node:crypto";

const DEFAULT_CRM_BASE_URL = "https://crm.example.com";
const REQUEST_TIMEOUT_MS = 5_000;

function normalizeLead(lead) {
  if (!lead || typeof lead !== "object") {
    throw new Error("lead must be an object");
  }

  const requiredFields = ["listingId", "name", "phone", "email", "message"];
  const normalizedLead = {};

  for (const field of requiredFields) {
    const value = lead[field];

    if (typeof value !== "string" && typeof value !== "number") {
      throw new Error(`lead.${field} is required`);
    }

    const normalizedValue = String(value).trim();
    if (!normalizedValue) {
      throw new Error(`lead.${field} is required`);
    }

    normalizedLead[field] = normalizedValue;
  }

  return normalizedLead;
}

function createIdempotencyKey(lead) {
  return createHash("sha256").update(JSON.stringify(lead)).digest("hex");
}

export async function createLead(lead) {
  const token = process.env.CRM_TOKEN;
  if (!token) {
    throw new Error("CRM token is not configured");
  }

  const normalizedLead = normalizeLead(lead);
  const idempotencyKey = createIdempotencyKey(normalizedLead);
  const crmBaseUrl = process.env.CRM_BASE_URL || DEFAULT_CRM_BASE_URL;
  const crmLeadsUrl = new URL("/v1/leads", crmBaseUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(crmLeadsUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(normalizedLead),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("CRM request timed out");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status !== 201) {
    throw new Error(`CRM request failed with status ${response.status}`);
  }

  return response.json();
}
