import { test } from "node:test";
import assert from "node:assert/strict";
import { authRequest, ClientRequestError } from "../src/lib/auth/client-request";

test("session connection failures return a useful error", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  try { await assert.rejects(authRequest("/session"), /Cannot connect to Hotel OS/); }
  finally { globalThis.fetch = original; }
});

test("deadline settles even when the transport ignores cancellation", async () => {
  const original = globalThis.fetch;
  let signal: AbortSignal | null | undefined;
  globalThis.fetch = async (_url, init) => { signal = init?.signal; return new Promise(() => {}); };
  try {
    await assert.rejects(authRequest("/session", {}, 20), /too long/);
    assert.equal(signal?.aborted, true);
  } finally { globalThis.fetch = original; }
});

test("deadline also covers a response body that stalls", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ json: () => new Promise(() => {}) }) as Response;
  try { await assert.rejects(authRequest("/session", {}, 20), ClientRequestError); }
  finally { globalThis.fetch = original; }
});

test("HTTP authentication failures retain their status for the session flow", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: "Sign in required" }), { status: 401 });
  try {
    const result = await authRequest("/session");
    assert.equal(result.response.status, 401);
    assert.equal(result.data.error, "Sign in required");
  } finally { globalThis.fetch = original; }
});
