/**
 * Temporal Activities — the side-effect-bearing units of work.
 *
 * Activities are the only place in a Temporal workflow where you can
 * do I/O (HTTP calls, DB queries, etc.). The workflow orchestrates them.
 *
 * This activity calls our mock supplier HTTP endpoints. In production,
 * these would call real third-party supplier APIs.
 */

import type { SupplierActivityRequest, SupplierResult } from "../types.js";
import { SupplierFailure } from "../types.js";

const SUPPLIER_BASE_URL =
  process.env.SUPPLIER_BASE_URL ?? "http://127.0.0.1:3001/api";

export async function fetchSupplierHotels(
  request: SupplierActivityRequest,
): Promise<SupplierResult> {
  const startedAt = Date.now();

  const params = new URLSearchParams({
    city: request.city,
    scenario: request.scenario,
    attempt: String(request.attempt ?? 1),
  });

  const endpoint =
    request.supplier === "Supplier A" ? "supplierA" : "supplierB";

  const response = await fetch(
    `${SUPPLIER_BASE_URL}/${endpoint}/hotels?${params}`,
  );

  if (!response.ok) {
    const message = await response.text();
    throw new SupplierFailure(
      message || `${request.supplier} returned HTTP ${response.status}`,
      response.status >= 500, // 5xx errors are retryable
    );
  }

  const rawOffers = (await response.json()) as Omit<
    SupplierResult["offers"][number],
    "supplier"
  >[];

  // Add the supplier field to each offer (the supplier endpoint doesn't include it)
  const offers = rawOffers.map((offer) => ({
    ...offer,
    supplier: request.supplier,
  }));

  return {
    supplier: request.supplier,
    status: offers.length > 0 ? "success" : "empty",
    durationMs: Date.now() - startedAt,
    offers,
    message: offers.length > 0 ? null : "No hotels matched this supplier",
  };
}

// Export as a named object so the worker can register all activities at once
export const activities = { fetchSupplierHotels };
