/**
 * Mock Supplier API endpoints.
 *
 * These simulate two external hotel suppliers (A and B) that the
 * Temporal workflow activities call. In production, these would be
 * third-party APIs like Expedia or Booking.com.
 *
 * Endpoints:
 *   GET /api/supplierA/hotels?city=X&scenario=Y&attempt=N
 *   GET /api/supplierB/hotels?city=X&scenario=Y&attempt=N
 *
 * The `scenario` parameter controls simulated behaviors:
 *   - delays, timeouts, server errors, empty responses
 *   - transient failures that succeed on retry
 */

import { Router } from "express";
import type { SupplierName, SearchScenario } from "../types.js";
import { isSearchScenario } from "../types.js";
import { buildSupplierOffers, shouldFail } from "../suppliers/mock-data.js";

const router = Router();

function parseScenario(value: unknown): SearchScenario {
  return isSearchScenario(value) ? value : "default";
}

async function handleSupplierRequest(
  req: import("express").Request,
  res: import("express").Response,
  supplier: SupplierName,
) {
  const city = typeof req.query.city === "string" ? req.query.city : "";
  const scenario = parseScenario(req.query.scenario);
  const attempt = Number(req.query.attempt ?? 1);

  if (city.length < 2) {
    res.status(400).json({ error: "A city parameter is required." });
    return;
  }

  // Simulate Supplier A taking >5 seconds (triggers timeout in the workflow)
  if (scenario === "supplier-a-timeout" && supplier === "Supplier A") {
    await new Promise((resolve) => setTimeout(resolve, 5_250));
  }

  // Simulate transient failures — Supplier A fails on attempts 1 and 2,
  // succeeds on attempt 3. Tests the retry policy.
  if (scenario === "supplier-a-retries" && supplier === "Supplier A" && attempt < 3) {
    res.status(503).json({
      error: `Supplier A transient failure on attempt ${attempt}`,
    });
    return;
  }

  // Simulate permanent server errors
  if (shouldFail(supplier, scenario)) {
    res.status(502).json({ error: `${supplier} returned a server error.` });
    return;
  }

  // Return hotel offers (without the supplier field — the activity adds it)
  const offers = buildSupplierOffers(supplier, city, scenario).map(
    ({ supplier: _supplier, ...offer }) => offer,
  );
  res.json(offers);
}

router.get("/supplierA/hotels", (req, res) => {
  void handleSupplierRequest(req, res, "Supplier A");
});

router.get("/supplierB/hotels", (req, res) => {
  void handleSupplierRequest(req, res, "Supplier B");
});

export default router;
