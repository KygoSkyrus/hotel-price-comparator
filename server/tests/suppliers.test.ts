/**
 * Advanced Scenario Tests — Supplier Activity Reliability
 *
 * Tests the 3 advanced scenarios from the assignment:
 *   1. One supplier takes >5s → Cancel slow activity, proceed with one result
 *   2. Supplier A fails 2x before success → Still succeeds within retry policy
 *   3. User cancels request mid-way → Workflow stops gracefully
 *
 * These test the local runner's retry/timeout/cancellation logic,
 * which mirrors the Temporal workflow's activity retry policy.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { callSupplierWithRetry } from "../src/temporal/local-runner.js";

describe("Advanced Scenarios — Supplier Reliability", () => {
  it("Scenario: Supplier A timeout → returns timeout result, does not block", async () => {
    const result = await callSupplierWithRetry({
      supplier: "Supplier A",
      city: "Tokyo",
      scenario: "supplier-a-timeout",
    });

    // The supplier took >5s, so it should be marked as timed out
    assert.equal(result.status, "timeout");
    assert.equal(result.offers.length, 0);
    assert.ok(result.message?.includes("timeout"));
  });

  it("Scenario: Supplier A fails 2x then succeeds on retry 3", async () => {
    const result = await callSupplierWithRetry({
      supplier: "Supplier A",
      city: "Lisbon",
      scenario: "supplier-a-retries",
    });

    // Should succeed after 2 transient failures
    assert.equal(result.status, "success");
    assert.equal(result.offers.length, 2);
  });

  it("Scenario: User cancels mid-flight → AbortError is thrown", async () => {
    const controller = new AbortController();
    const pending = callSupplierWithRetry(
      {
        supplier: "Supplier A",
        city: "Lisbon",
        scenario: "supplier-a-timeout", // Takes >5s, giving us time to cancel
      },
      { signal: controller.signal },
    );

    // Cancel after 25ms (well before the supplier responds)
    setTimeout(() => controller.abort(), 25);

    await assert.rejects(pending, { name: "AbortError" });
  });
});
