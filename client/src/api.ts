import type { HotelSearchResult } from "./types";

/**
 * Calls the backend search endpoint.
 * Simple fetch wrapper — no generated code, no React Query.
 */
export async function searchHotels(params: {
  city: string;
  checkIn: string;
  checkOut: string;
  scenario?: string;
}): Promise<HotelSearchResult> {
  const runId = `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const response = await fetch("/api/search-hotels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runId, ...params }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Cancels a running search by its run ID.
 */
export async function cancelSearch(runId: string): Promise<void> {
  await fetch(`/api/search-hotels/${runId}/cancel`, { method: "POST" });
}
