// Shared types used across the server

export const SUPPLIER_NAMES = ["Supplier A", "Supplier B"] as const;
export type SupplierName = (typeof SUPPLIER_NAMES)[number];

export type SearchScenario =
  | "default"
  | "supplier-a-cheaper"
  | "supplier-b-cheaper"
  | "same-rate"
  | "supplier-a-fails"
  | "supplier-b-fails"
  | "both-fail"
  | "one-empty"
  | "both-empty"
  | "supplier-a-timeout"
  | "supplier-a-retries";

export type HotelSearchInput = {
  runId: string;
  city: string;
  checkIn: string;
  checkOut: string;
  scenario?: SearchScenario;
};

export type HotelOffer = {
  hotelId: string;
  name: string;
  price: number;
  currency: string;
  supplier: SupplierName;
  rating: number;
  refundable: boolean;
};

export type SupplierResult = {
  supplier: SupplierName;
  status: "success" | "empty" | "failed" | "timeout";
  durationMs: number;
  offers: HotelOffer[];
  message: string | null;
};

export type HotelSearchResult = {
  runId: string;
  status: "completed" | "partial" | "empty" | "failed" | "cancelled";
  city: string;
  checkIn: string;
  checkOut: string;
  bestOffer: HotelOffer | null;
  supplierResults: SupplierResult[];
  completedAt: string;
  message: string | null;
};

export type SearchRun = {
  runId: string;
  city: string;
  dates: string;
  status: HotelSearchResult["status"];
  bestPrice: number | null;
  supplier: string | null;
  durationMs: number;
  createdAt: string;
};

// Used when an activity calls a supplier endpoint
export type SupplierActivityRequest = {
  supplier: SupplierName;
  city: string;
  scenario: SearchScenario;
  attempt?: number;
};

/**
 * thrown when a supplier returns an error response.
 * the `retryable` flag tells the retry logic whether it's worth trying again.
 */
export class SupplierFailure extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.name = "SupplierFailure";
    this.retryable = retryable;
  }
}

/**
 * thrown when a supplier takes too long to respond.
 * the workflow treats this as a terminal failure for that supplier
 * (no point retrying a slow supplier — use the other one).
 */
export class SupplierTimeout extends Error {
  constructor(message = "Supplier exceeded the 5-second activity timeout") {
    super(message);
    this.name = "SupplierTimeout";
  }
}

export function isSearchScenario(value: unknown): value is SearchScenario {
  return (
    typeof value === "string" &&
    [
      "default",
      "supplier-a-cheaper",
      "supplier-b-cheaper",
      "same-rate",
      "supplier-a-fails",
      "supplier-b-fails",
      "both-fail",
      "one-empty",
      "both-empty",
      "supplier-a-timeout",
      "supplier-a-retries",
    ].includes(value)
  );
}
