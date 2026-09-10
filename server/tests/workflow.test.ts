/**
 * Integration Tests — Full Workflow Pipeline
 *
 * These tests exercise the complete flow from search input to
 * final comparison result, using the local runner (no Temporal needed).
 * This validates that all the pieces work together correctly.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runLocalSearch, cancelLocalSearch } from "../src/temporal/local-runner.js";
import type { HotelSearchInput } from "../src/types.js";

function makeInput(scenario = "default"): HotelSearchInput {
  return {
    runId: `integration-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    city: "Barcelona",
    checkIn: "2026-10-01",
    checkOut: "2026-10-04",
    scenario: scenario as HotelSearchInput["scenario"],
  };
}

describe("Integration — Full Search Pipeline", () => {
  it("completes a normal search with both suppliers", async () => {
    const result = await runLocalSearch(makeInput("default"));

    assert.equal(result.status, "completed");
    assert.ok(result.bestOffer, "Should have a best offer");
    assert.equal(result.supplierResults.length, 2);
    assert.equal(result.bestOffer.supplier, "Supplier A"); // A is cheaper by default
    assert.equal(result.bestOffer.price, 142);
    assert.ok(result.completedAt, "Should have a completion timestamp");
  });

  it("handles one supplier failing gracefully", async () => {
    const result = await runLocalSearch(makeInput("supplier-a-fails"));

    assert.equal(result.status, "partial");
    assert.ok(result.bestOffer, "Should still return B's offer");
    assert.equal(result.bestOffer.supplier, "Supplier B");
  });

  it("handles both suppliers failing", async () => {
    const result = await runLocalSearch(makeInput("both-fail"));

    assert.equal(result.status, "failed");
    assert.equal(result.bestOffer, null);
    assert.equal(result.message, "All supplier feeds failed");
  });

  it("handles both suppliers returning empty", async () => {
    const result = await runLocalSearch(makeInput("both-empty"));

    assert.equal(result.status, "empty");
    assert.equal(result.bestOffer, null);
    assert.equal(result.message, "No hotels found");
  });

  it("cancels a running search via cancelLocalSearch", async () => {
    const input = makeInput("supplier-a-timeout"); // Takes >5s
    const promise = runLocalSearch(input);

    // Cancel after a short delay
    setTimeout(() => cancelLocalSearch(input.runId), 50);

    const result = await promise;
    assert.equal(result.status, "cancelled");
    assert.equal(result.message, "Comparison cancelled by user");
  });
});
