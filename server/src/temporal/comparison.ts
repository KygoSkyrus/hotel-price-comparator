/**
 * Comparison logic — the core decision engine.
 *
 * This module is pure functions with no side effects, making it
 * easy to test. It takes supplier results and determines:
 *   1. The cheapest hotel offer across all suppliers
 *   2. The overall status of the comparison run
 *
 * Used by both the Temporal workflow and the local fallback runner.
 */

import type {
  HotelSearchInput,
  HotelSearchResult,
  SupplierResult,
} from "../types.js";

/**
 * Takes results from all suppliers and returns the final comparison outcome.
 *
 * Selection rules:
 *   - Pick the offer with the lowest price
 *   - If two offers have the same price, pick Supplier A (deterministic tie-break)
 *   - If one supplier failed/timed out but the other succeeded, return "partial"
 *   - If both failed, return "failed"
 *   - If both returned empty, return "empty" with "No hotels found"
 */
export function compareSupplierResults(
  input: HotelSearchInput,
  supplierResults: SupplierResult[],
  completedAt = new Date().toISOString(),
): HotelSearchResult {
  // Flatten all offers from all suppliers into one list
  const offers = supplierResults.flatMap((result) => result.offers);

  // Sort by price ascending, break ties by preferring Supplier A
  const bestOffer =
    [...offers].sort((left, right) => {
      if (left.price !== right.price) return left.price - right.price;
      return left.supplier === "Supplier A" ? -1 : 1;
    })[0] ?? null;

  // Determine overall status
  const hasUnavailableSupplier = supplierResults.some(
    (result) => result.status !== "success",
  );

  const status = bestOffer
    ? hasUnavailableSupplier
      ? "partial"
      : "completed"
    : supplierResults.every((result) => result.status === "empty")
      ? "empty"
      : "failed";

  return {
    runId: input.runId,
    status,
    city: input.city,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    bestOffer,
    supplierResults,
    completedAt,
    message: bestOffer
      ? null
      : status === "empty"
        ? "No hotels found"
        : "All supplier feeds failed",
  };
}

/**
 * Returns a result representing a cancelled comparison run.
 */
export function cancelledSearchResult(
  input: HotelSearchInput,
  supplierResults: SupplierResult[] = [],
  completedAt = new Date().toISOString(),
): HotelSearchResult {
  return {
    runId: input.runId,
    status: "cancelled",
    city: input.city,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    bestOffer: null,
    supplierResults,
    completedAt,
    message: "Comparison cancelled by user",
  };
}
