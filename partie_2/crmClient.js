const DEFAULT_CRM_BASE_URL = "https://crm.example.com";

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

export async function createLead(lead) {
  const token = process.env.CRM_TOKEN;
  if (!token) {
    throw new Error("CRM token is not configured");
  }

  const crmBaseUrl = process.env.CRM_BASE_URL || DEFAULT_CRM_BASE_URL;
  const crmLeadsUrl = new URL("/v1/leads", crmBaseUrl);

  const response = await fetch(crmLeadsUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(normalizeLead(lead)),
  });

  if (response.status !== 201) {
    throw new Error(`CRM request failed with status ${response.status}`);
  }

  return response.json();
}
