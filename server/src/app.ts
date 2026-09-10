import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import supplierRoutes from "./routes/suppliers.js";
import searchRoutes from "./routes/search.js";

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Mount API routes
app.use("/api", supplierRoutes);
app.use("/api", searchRoutes);

// Serve static frontend files in production or if client/dist exists
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, "../../client/dist");

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));

  // SPA fallback for React routing (catch-all non-API requests for Express 5)
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

export default app;


