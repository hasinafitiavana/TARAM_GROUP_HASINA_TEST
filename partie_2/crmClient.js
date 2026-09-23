import { createHash } from "node:crypto";

const DEFAULT_CRM_BASE_URL = "https://crm.example.com";
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 500;

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

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function isRetryableStatus(status) {
  return status === 429 || status === 500 || status === 502 || status === 503;
}

function getRetryDelayMs(response, attempt) {
  const retryAfter = response.headers.get("retry-after");
  const retryAfterSeconds = retryAfter === null ? Number.NaN : Number(retryAfter);

  if (response.status === 429 && Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return retryAfterSeconds * 1_000;
  }

  return INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1);
}

async function sendLeadRequest({ url, token, lead, idempotencyKey }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(lead),
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

  return response;
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

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let response;

    try {
      response = await sendLeadRequest({
        url: crmLeadsUrl,
        token,
        lead: normalizedLead,
        idempotencyKey,
      });
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        throw new Error("CRM request failed after maximum retry attempts");
      }

      await wait(INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1));
      continue;
    }

    if (response.status === 201) {
      return response.json();
    }

    if (!isRetryableStatus(response.status)) {
      throw new Error(`CRM request failed with status ${response.status}`);
    }

    if (attempt === MAX_ATTEMPTS) {
      throw new Error("CRM request failed after maximum retry attempts");
    }

    await wait(getRetryDelayMs(response, attempt));
  }
}
