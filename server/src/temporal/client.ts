/**
 * Temporal Client — connects to the Temporal server to start workflows.
 *
 * This is used by the Express route handler to kick off a search workflow.
 * If Temporal is not configured (no TEMPORAL_ADDRESS env var), it returns null
 * and the route falls back to the local runner.
 */

import { Client, Connection } from "@temporalio/client";
import type { searchHotelsWorkflow } from "./workflows.js";
import type { HotelSearchInput, HotelSearchResult } from "../types.js";

let clientPromise: Promise<Client | null> | null = null;

async function getClient(): Promise<Client | null> {
  if (!process.env.TEMPORAL_ADDRESS) {
    return null;
  }

  if (!clientPromise) {
    clientPromise = Connection.connect({
      address: process.env.TEMPORAL_ADDRESS,
    })
      .then(
        (connection) =>
          new Client({
            connection,
            namespace: process.env.TEMPORAL_NAMESPACE ?? "default",
          }),
      )
      .catch(() => null);
  }

  return clientPromise;
}

/**
 * Starts a Temporal workflow to run the hotel comparison.
 * Returns null if Temporal is not configured or unavailable.
 */
export async function runTemporalSearch(
  input: HotelSearchInput,
): Promise<HotelSearchResult | null> {
  const client = await getClient();
  if (!client) return null;

  return client.workflow.execute<typeof searchHotelsWorkflow>(
    "searchHotelsWorkflow",
    {
      workflowId: input.runId,
      taskQueue: process.env.TEMPORAL_TASK_QUEUE ?? "hotel-search",
      args: [input],
    },
  );
}

/**
 * Cancels a running Temporal workflow by its ID.
 */
export async function cancelTemporalSearch(runId: string): Promise<boolean> {
  const client = await getClient();
  if (!client) return false;

  try {
    await client.workflow.getHandle(runId).cancel();
    return true;
  } catch {
    return false;
  }
}
