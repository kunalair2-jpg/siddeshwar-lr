import express from "express";
import cors from "cors";
import "./db.js";
import { requireAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import vehicleRoutes from "./routes/vehicles.js";
import clientRoutes from "./routes/clients.js";
import lrRoutes from "./routes/lrs.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/vehicles", requireAuth, vehicleRoutes);
app.use("/api/clients", requireAuth, clientRoutes);
app.use("/api/lrs", requireAuth, lrRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.listen(PORT, () => {
  console.log(`Transport ERP API listening on http://localhost:${PORT}`);
});
