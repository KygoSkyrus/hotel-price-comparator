import express from "express";
import cors from "cors";
import supplierRoutes from "./routes/suppliers.js";
import searchRoutes from "./routes/search.js";

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Mount routes
app.use("/api", supplierRoutes);
app.use("/api", searchRoutes);

// Serve static frontend in production (Azure App Service compatibility)
if (process.env.NODE_ENV === "production") {
  const clientDist = new URL("../../client/dist", import.meta.url).pathname;
  app.use(express.static(clientDist));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(`${clientDist}/index.html`);
  });
}

export default app;

