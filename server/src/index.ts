import app from "./app.js";

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
  console.log(`[server] Supplier A: http://localhost:${PORT}/api/supplierA/hotels`);
  console.log(`[server] Supplier B: http://localhost:${PORT}/api/supplierB/hotels`);
  console.log(`[server] Search:     POST http://localhost:${PORT}/api/search-hotels`);
});
