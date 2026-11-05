import express from "express";
import cors from "cors";
import db from "./config/database.js";
import sensorRoutes from "./routes/sensorRoutes.js";
import cleaningRoutes from "./routes/cleaningRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import { requireKey } from "./middleware/auth.js";
import { dbta } from "./services/espService.js";
const app = express();
app.disable("x-powered-by");
const origins = (process.env.FRONTEND_URL || "http://localhost:5500").split(",").map(v => v.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) { callback(null, !origin || origins.includes(origin)); },
  methods: ["GET", "POST"], allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "16kb" }));
app.get("/", (req, res) => res.json({ status: "online", message: "API Limpsol" }));
app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1"); dbta.connected = true;
    res.json({ status: "ok" });
  } catch {
    dbta.connected = false; res.status(503).json({ status: "unavailable" });
  }
});
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  return requireKey(req.path === "/heartbeat" ? "DEVICE_API_KEY" : "ADMIN_API_KEY")(req, res, next);
});
app.use("/api", sensorRoutes, cleaningRoutes, settingsRoutes);
app.use((req, res) => res.status(404).json({ error: "Rota não encontrada" }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status >= 400 && error.status < 500 ? error.status : 500;
  console.error("Falha na requisição:", error.code || error.name);
  res.status(status).json({ error: status === 500 ? "Erro interno" : "Requisição inválida" });
});
export default app;
