import assert from "node:assert/strict";
import test from "node:test";

import { createLead } from "./crmClient.js";

const lead = {
  listingId: "listing-42",
  name: "Ada Lovelace",
  phone: "+261340000000",
  email: "ada@example.com",
  message: "Je souhaite visiter ce bien.",
};

function configureCrmEnvironment() {
  process.env.CRM_TOKEN = "test-token";
  process.env.CRM_BASE_URL = "https://crm.mock";
}

test("createLead retries after 429 then succeeds", async () => {
  configureCrmEnvironment();
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });

    if (calls.length === 1) {
      return new Response(null, {
        status: 429,
        headers: { "Retry-After": "0" },
      });
    }

    return new Response(JSON.stringify({ id: "lead-1", createdAt: "2026-09-23T10:00:00Z" }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const result = await createLead(lead);

    assert.deepEqual(result, { id: "lead-1", createdAt: "2026-09-23T10:00:00Z" });
    assert.equal(calls.length, 2);
    assert.equal(
      calls[0].options.headers["Idempotency-Key"],
      calls[1].options.headers["Idempotency-Key"],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createLead stops after three 500 responses", async () => {
  configureCrmEnvironment();
  const originalFetch = globalThis.fetch;
  let callCount = 0;

  globalThis.fetch = async () => {
    callCount += 1;
    return new Response(null, { status: 500 });
  };

  try {
    await assert.rejects(createLead(lead), /maximum retry attempts/);
    assert.equal(callCount, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
