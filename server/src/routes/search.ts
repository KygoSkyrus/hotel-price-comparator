/**
 * Hotel search API routes.
 *
 * POST /api/search-hotels: Start a comparison run across both suppliers
 * POST /api/search-hotels/:runId/cancel: Cancel a running comparison
 * GET  /api/search-runs: List recent comparison runs (in-memory)
 */

import { Router } from "express";
import type {
  HotelSearchInput,
  HotelSearchResult,
  SearchRun,
  SearchScenario,
} from "../types.js";
import { isSearchScenario } from "../types.js";
import { runTemporalSearch, cancelTemporalSearch } from "../temporal/client.js";
import { runLocalSearch, cancelLocalSearch } from "../temporal/local-runner.js";
import { compareSupplierResults, cancelledSearchResult } from "../temporal/comparison.js";

const router = Router();

// in-memory store of recent runs (keeps the last 20)
// a production system would persist these in a database
const recentRuns: SearchRun[] = [];

function makeRunId(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function recordRun(result: HotelSearchResult, durationMs: number) {
  const checkInDate = new Date(`${result.checkIn}T12:00:00`);
  const checkOutDate = new Date(`${result.checkOut}T12:00:00`);
  const dateFormat: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };

  recentRuns.unshift({
    runId: result.runId,
    city: result.city,
    dates: `${checkInDate.toLocaleDateString("en-GB", dateFormat)}–${checkOutDate.toLocaleDateString("en-GB", dateFormat)}`,
    status: result.status,
    bestPrice: result.bestOffer?.price ?? null,
    supplier: result.bestOffer?.supplier ?? null,
    durationMs,
    createdAt: result.completedAt,
  });

  // keep only 20 most recent
  if (recentRuns.length > 20) recentRuns.splice(20);
}

/**
 * tries to run the search via temporal first. if temporal isn't available
 * (no server running), falls back to the local runner which executes
 * the same comparison logic in process.
 */
async function runComparison(input: HotelSearchInput): Promise<HotelSearchResult> {
  try {
    const temporalResult = await runTemporalSearch(input);
    if (temporalResult) return temporalResult;
  } catch {
    // Temporal server not available — fall back to local runner
  }
  return runLocalSearch(input);
}

// --- POST /api/search-hotels ---
router.post("/search-hotels", async (req, res) => {
  const { runId, city, checkIn, checkOut, scenario } = req.body;

  // Validate inputs
  if (!city || typeof city !== "string" || city.trim().length < 2) {
    res.status(400).json({ error: "A city name is required (at least 2 characters)." });
    return;
  }
  if (!checkIn || !checkOut) {
    res.status(400).json({ error: "Both check-in and check-out dates are required." });
    return;
  }
  if (checkOut <= checkIn) {
    res.status(400).json({ error: "Check-out date must be after check-in date." });
    return;
  }

  const input: HotelSearchInput = {
    runId: runId || makeRunId(),
    city: city.trim(),
    checkIn,
    checkOut,
    scenario: isSearchScenario(scenario) ? scenario : "default",
  };

  const startedAt = Date.now();
  let settled = false;

  // If the client disconnects while the search is running, cancel it
  req.on("close", () => {
    if (!settled) cancelLocalSearch(input.runId);
  });

  try {
    const result = await runComparison(input);
    settled = true;
    recordRun(result, Date.now() - startedAt);
    console.log(`[search] ${result.runId} → ${result.status} (${result.city})`);
    res.json(result);
  } catch (error) {
    settled = true;
    if (error instanceof Error && /cancel/i.test(error.message)) {
      const cancelled = cancelledSearchResult(input);
      recordRun(cancelled, Date.now() - startedAt);
      res.json(cancelled);
      return;
    }
    console.error("[search] Comparison failed:", error);
    res.status(500).json({ error: "The comparison workflow could not complete." });
  }
});

// --- POST /api/search-hotels/:runId/cancel ---
router.post("/search-hotels/:runId/cancel", async (req, res) => {
  const { runId } = req.params;
  const cancelled =
    cancelLocalSearch(runId) || (await cancelTemporalSearch(runId));

  if (!cancelled) {
    res.status(404).json({ error: "No active comparison found for that run ID." });
    return;
  }

  res.json({ runId, status: "cancelling", message: "Cancellation requested." });
});

// --- GET /api/search-runs ---
router.get("/search-runs", (_req, res) => {
  res.json(recentRuns);
});

export default router;
