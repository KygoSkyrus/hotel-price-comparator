/**
 * Comparison Logic Tests
 *
 * Tests all 7 basic scenarios from the assignment:
 *   1. Supplier A cheaper → Return A's result
 *   2. Supplier B cheaper → Return B's result
 *   3. Both return same rate → Pick deterministically (Supplier A)
 *   4. Supplier A fails, B succeeds → Return B's result
 *   5. Both fail → Return error
 *   6. One returns empty → Use available result
 *   7. Both return empty → Return "No hotels found"
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareSupplierResults } from "../src/temporal/comparison.js";
import { buildSupplierOffers } from "../src/suppliers/mock-data.js";
import type { HotelSearchInput, SupplierResult } from "../src/types.js";

// Test fixture: a standard search input
const input: HotelSearchInput = {
  runId: "test-run",
  city: "Lisbon",
  checkIn: "2026-09-16",
  checkOut: "2026-09-19",
  scenario: "default",
};

// Helper: build a SupplierResult with sensible defaults
function makeResult(
  supplier: "Supplier A" | "Supplier B",
  status: SupplierResult["status"],
  offers = buildSupplierOffers(supplier, input.city, "default"),
): SupplierResult {
  return {
    supplier,
    status,
    durationMs: 25,
    offers,
    message: status === "success" ? null : `${supplier} ${status}`,
  };
}

describe("Basic Scenarios — Comparison Logic", () => {
  it("Scenario 1: Returns Supplier A when A is cheaper", () => {
    const output = compareSupplierResults(input, [
      // A at default price ($142)
      makeResult("Supplier A", "success"),
      // B at higher price ($160)
      makeResult(
        "Supplier B",
        "success",
        buildSupplierOffers("Supplier B", input.city, "default"),
      ),
    ]);

    assert.equal(output.status, "completed");
    assert.equal(output.bestOffer?.supplier, "Supplier A");
    assert.equal(output.bestOffer?.price, 142);
  });

  it("Scenario 2: Returns Supplier B when B is cheaper", () => {
    const output = compareSupplierResults(input, [
      // A at $172, B at $142
      makeResult(
        "Supplier A",
        "success",
        buildSupplierOffers("Supplier A", input.city, "supplier-b-cheaper"),
      ),
      makeResult(
        "Supplier B",
        "success",
        buildSupplierOffers("Supplier B", input.city, "supplier-b-cheaper"),
      ),
    ]);

    assert.equal(output.status, "completed");
    assert.equal(output.bestOffer?.supplier, "Supplier B");
    assert.equal(output.bestOffer?.price, 142);
  });

  it("Scenario 3: Breaks ties deterministically (picks Supplier A)", () => {
    const output = compareSupplierResults(input, [
      // Both at $142
      makeResult(
        "Supplier A",
        "success",
        buildSupplierOffers("Supplier A", input.city, "same-rate"),
      ),
      makeResult(
        "Supplier B",
        "success",
        buildSupplierOffers("Supplier B", input.city, "same-rate"),
      ),
    ]);

    assert.equal(output.status, "completed");
    assert.equal(output.bestOffer?.supplier, "Supplier A");
  });

  it("Scenario 4: Returns B's result when A fails", () => {
    const output = compareSupplierResults(input, [
      makeResult("Supplier A", "failed", []),
      makeResult("Supplier B", "success"),
    ]);

    assert.equal(output.status, "partial");
    assert.equal(output.bestOffer?.supplier, "Supplier B");
  });

  it("Scenario 5: Returns error when both fail", () => {
    const output = compareSupplierResults(input, [
      makeResult("Supplier A", "failed", []),
      makeResult("Supplier B", "timeout", []),
    ]);

    assert.equal(output.status, "failed");
    assert.equal(output.bestOffer, null);
    assert.equal(output.message, "All supplier feeds failed");
  });

  it("Scenario 6: Uses available result when one supplier is empty", () => {
    const output = compareSupplierResults(input, [
      makeResult("Supplier A", "empty", []),
      makeResult("Supplier B", "success"),
    ]);

    assert.equal(output.status, "partial");
    assert.equal(output.bestOffer?.supplier, "Supplier B");
  });

  it('Scenario 7: Returns "No hotels found" when both are empty', () => {
    const output = compareSupplierResults(input, [
      makeResult("Supplier A", "empty", []),
      makeResult("Supplier B", "empty", []),
    ]);

    assert.equal(output.status, "empty");
    assert.equal(output.bestOffer, null);
    assert.equal(output.message, "No hotels found");
  });
});
