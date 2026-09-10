/**
 * Temporal Workflow — the orchestration logic.
 *
 * Workflows are deterministic, durable functions. Temporal replays them
 * on failure, so they must not contain any side effects (no HTTP calls,
 * no random, no Date.now). All I/O goes through Activities.
 *
 * This workflow:
 *   1. Calls both Supplier A and Supplier B in parallel (via activities)
 *   2. Handles errors and timeouts from each supplier independently
 *   3. Compares results and selects the cheapest offer
 *   4. Returns the final comparison result
 */

import { proxyActivities } from "@temporalio/workflow";
import type { activities } from "./activities.js";
import { compareSupplierResults, cancelledSearchResult } from "./comparison.js";
import type { HotelSearchInput, SupplierResult } from "../types.js";

// Create activity proxies with timeout and retry configuration
const { fetchSupplierHotels } = proxyActivities<typeof activities>({
  // Each supplier call must complete within 5 seconds
  startToCloseTimeout: "5 seconds",
  retry: {
    initialInterval: "200 milliseconds",
    backoffCoefficient: 2,
    maximumInterval: "2 seconds",
    maximumAttempts: 3, // Up to 3 total attempts per supplier
  },
});

/**
 * Main search workflow.
 *
 * Calls both suppliers in parallel. If one fails or times out,
 * the other's result is still used. If both fail, returns an error.
 */
export async function searchHotelsWorkflow(
  input: HotelSearchInput,
): Promise<ReturnType<typeof compareSupplierResults>> {
  const results = await Promise.all(
    (["Supplier A", "Supplier B"] as const).map(async (supplier) => {
      try {
        return await fetchSupplierHotels({
          supplier,
          city: input.city,
          scenario: input.scenario ?? "default",
        });
      } catch (error) {
        // If the activity failed after all retries, return a failure result
        // instead of letting the whole workflow crash
        return {
          supplier,
          status:
            error instanceof Error && error.name === "TimeoutFailure"
              ? "timeout"
              : "failed",
          durationMs: 5_000,
          offers: [],
          message:
            error instanceof Error ? error.message : "Supplier unavailable",
        } satisfies SupplierResult;
      }
    }),
  );

  return compareSupplierResults(input, results);
}

/**
 * Cancellation handler — returns a clean cancelled result.
 * Called when the user explicitly cancels a search mid-flight.
 */
export function cancelSearchWorkflow(
  input: HotelSearchInput,
): ReturnType<typeof cancelledSearchResult> {
  return cancelledSearchResult(input);
}
