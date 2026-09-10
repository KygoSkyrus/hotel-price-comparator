/**
 * Temporal Worker — listens for workflow tasks and executes them.
 *
 * Run this as a separate process:
 *   npx tsx src/temporal/worker.ts
 *
 * The worker connects to the Temporal server, registers our workflows
 * and activities, and polls for work. When a search workflow is started
 * (via the /api/search-hotels endpoint), the worker picks it up and
 * executes the workflow + activity code.
 */

import { NativeConnection, Worker } from "@temporalio/worker";
import { activities } from "./activities.js";

const address = process.env.TEMPORAL_ADDRESS ?? "localhost:7233";
const namespace = process.env.TEMPORAL_NAMESPACE ?? "default";
const taskQueue = process.env.TEMPORAL_TASK_QUEUE ?? "hotel-search";

async function start() {
  const connection = await NativeConnection.connect({ address });

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue,
    workflowsPath: new URL("./workflows.ts", import.meta.url).pathname,
    activities,
  });

  console.log(`[worker] Listening on task queue "${taskQueue}" at ${address}`);
  await worker.run();
}

start().catch((err) => {
  console.error("[worker] Failed to start:", err);
  process.exit(1);
});
