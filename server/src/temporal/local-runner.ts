/**
 * Local Runner — runs the comparison logic without a Temporal server.
 *
 * This is a fallback for development and demos. It executes the exact
 * same comparison logic that the Temporal workflow does, but in-process
 * instead of through the Temporal runtime.
 *
 * Why keep this?
 *   - The Temporal server is a separate process (Docker container)
 *   - During interviews or quick demos, you might not have it running
 *   - This ensures the app is fully functional without Temporal
 *   - The business logic (comparison, error handling) is identical
 */

import type {
  HotelSearchInput,
  HotelSearchResult,
  SearchScenario,
  SupplierActivityRequest,
  SupplierName,
  SupplierResult,
} from "../types.js";
import { SupplierFailure, SupplierTimeout } from "../types.js";
import { buildSupplierOffers, shouldFail, shouldBeEmpty } from "../suppliers/mock-data.js";
import { compareSupplierResults, cancelledSearchResult } from "./comparison.js";

const ACTIVITY_TIMEOUT_MS = 5_000;

// Track active runs so we can cancel them
const activeRuns = new Map<string, AbortController>();

function wait(durationMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Comparison was cancelled", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, durationMs);
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Comparison was cancelled", "AbortError"));
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function withTimeout<T>(
  promise: Promise<T>,
  durationMs: number,
  signal?: AbortSignal,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new SupplierTimeout()), durationMs);
  });

  const abortPromise = signal
    ? new Promise<never>((_, reject) => {
        if (signal.aborted) {
          reject(new DOMException("Comparison was cancelled", "AbortError"));
          return;
        }
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("Comparison was cancelled", "AbortError")),
          { once: true },
        );
      })
    : null;

  return Promise.race(
    abortPromise
      ? [promise, timeoutPromise, abortPromise]
      : [promise, timeoutPromise],
  ).finally(() => clearTimeout(timer));
}

/**
 * Simulates calling a supplier endpoint with realistic delays.
 * This mirrors what the Temporal activity does, but in-process.
 */
async function simulateSupplierCall(
  request: SupplierActivityRequest,
  signal?: AbortSignal,
): Promise<SupplierResult> {
  const startedAt = Date.now();
  const { supplier, city, scenario, attempt = 1 } = request;

  // Simulate network latency
  if (scenario === "supplier-a-timeout" && supplier === "Supplier A") {
    await wait(ACTIVITY_TIMEOUT_MS + 250, signal);
  } else {
    await wait(supplier === "Supplier A" ? 640 : 920, signal);
  }

  // Simulate transient failures (retryable)
  if (scenario === "supplier-a-retries" && supplier === "Supplier A" && attempt < 3) {
    throw new SupplierFailure(
      `Supplier A transient failure on attempt ${attempt}`,
      true,
    );
  }

  // Simulate permanent failures
  if (shouldFail(supplier, scenario)) {
    throw new SupplierFailure(`${supplier} returned a server error`);
  }

  const offers = buildSupplierOffers(supplier, city, scenario);
  return {
    supplier,
    status: offers.length > 0 ? "success" : "empty",
    durationMs: Date.now() - startedAt,
    offers,
    message: offers.length > 0 ? null : "No hotels matched this supplier",
  };
}

/**
 * Calls a supplier with retry and timeout logic.
 * Mirrors the Temporal activity retry policy.
 */
async function callSupplierWithRetry(
  request: SupplierActivityRequest,
  options: { signal?: AbortSignal; maxAttempts?: number } = {},
): Promise<SupplierResult> {
  const maxAttempts = options.maxAttempts ?? 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startedAt = Date.now();
    try {
      return await withTimeout(
        simulateSupplierCall({ ...request, attempt }, options.signal),
        ACTIVITY_TIMEOUT_MS,
        options.signal,
      );
    } catch (error) {
      lastError = error;

      if (error instanceof SupplierTimeout) {
        return {
          supplier: request.supplier,
          status: "timeout",
          durationMs: Date.now() - startedAt,
          offers: [],
          message: error.message,
        };
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }

      if (
        !(error instanceof SupplierFailure) ||
        !error.retryable ||
        attempt === maxAttempts
      ) {
        return {
          supplier: request.supplier,
          status: "failed",
          durationMs: Date.now() - startedAt,
          offers: [],
          message: error instanceof Error ? error.message : "Supplier unavailable",
        };
      }
    }
  }

  throw lastError;
}

/**
 * Runs a full hotel comparison locally (no Temporal needed).
 * Calls both suppliers in parallel, handles errors, returns the best rate.
 */
export async function runLocalSearch(
  input: HotelSearchInput,
): Promise<HotelSearchResult> {
  const controller = new AbortController();
  activeRuns.set(input.runId, controller);

  try {
    const results = await Promise.all(
      (["Supplier A", "Supplier B"] as const).map(async (supplier) => {
        try {
          return await callSupplierWithRetry(
            {
              supplier,
              city: input.city,
              scenario: input.scenario ?? "default",
            },
            { signal: controller.signal },
          );
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
          }
          return {
            supplier,
            status: "failed",
            durationMs: 0,
            offers: [],
            message: error instanceof Error ? error.message : "Supplier unavailable",
          } satisfies SupplierResult;
        }
      }),
    );

    return compareSupplierResults(input, results);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return cancelledSearchResult(input);
    }
    throw error;
  } finally {
    activeRuns.delete(input.runId);
  }
}

/**
 * Cancels an active local search by aborting its controller.
 */
export function cancelLocalSearch(runId: string): boolean {
  const controller = activeRuns.get(runId);
  if (!controller) return false;
  controller.abort();
  return true;
}

// Export for testing
export { simulateSupplierCall, callSupplierWithRetry };
