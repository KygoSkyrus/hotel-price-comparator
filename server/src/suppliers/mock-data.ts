/**
 * Mock supplier data generator.
 *
 * in a real system, these would be actual third-party APIs (Expedia, Booking.com, etc.).
 * here we control the behavior via "scenarios" so we can test every edge case.
 */

import type { HotelOffer, SearchScenario, SupplierName } from "../types.js";

function titleCase(value: string): string {
  return value.trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * returns a price that varies by supplier and scenario.
 * this lets us test "A cheaper", "B cheaper", and "same rate" cases.
 */
function priceFor(supplier: SupplierName, scenario: SearchScenario): number {
  if (scenario === "supplier-b-cheaper") {
    return supplier === "Supplier A" ? 172 : 142;
  }
  if (scenario === "same-rate") {
    return 142;
  }
  // Default: Supplier A is cheaper
  return supplier === "Supplier A" ? 142 : 160;
}

function shouldFail(supplier: SupplierName, scenario: SearchScenario): boolean {
  return (
    scenario === "both-fail" ||
    (scenario === "supplier-a-fails" && supplier === "Supplier A") ||
    (scenario === "supplier-b-fails" && supplier === "Supplier B")
  );
}

function shouldBeEmpty(supplier: SupplierName, scenario: SearchScenario): boolean {
  return (
    scenario === "both-empty" ||
    (scenario === "one-empty" && supplier === "Supplier A")
  );
}

/**
 * generates a list of mock hotel offers for a given supplier and city.
 * each supplier returns different hotel names to make results distinguishable.
 */
export function buildSupplierOffers(
  supplier: SupplierName,
  city: string,
  scenario: SearchScenario,
): HotelOffer[] {
  if (shouldBeEmpty(supplier, scenario)) return [];

  const cityLabel = titleCase(city);
  const prefix = supplier === "Supplier A" ? "a" : "b";
  const price = priceFor(supplier, scenario);

  return [
    {
      hotelId: `${prefix}-${city.toLowerCase().replace(/\s+/g, "-")}-01`,
      name: `${cityLabel} ${supplier === "Supplier A" ? "Central House" : "Garden Hotel"}`,
      price,
      currency: "USD",
      supplier,
      rating: supplier === "Supplier A" ? 4.7 : 4.5,
      refundable: supplier === "Supplier A",
    },
    {
      hotelId: `${prefix}-${city.toLowerCase().replace(/\s+/g, "-")}-02`,
      name: `${cityLabel} ${supplier === "Supplier A" ? "Riverside Suites" : "The Meridian"}`,
      price: price + 42,
      currency: "USD",
      supplier,
      rating: supplier === "Supplier A" ? 4.3 : 4.8,
      refundable: true,
    },
  ];
}

export { shouldFail, shouldBeEmpty };
