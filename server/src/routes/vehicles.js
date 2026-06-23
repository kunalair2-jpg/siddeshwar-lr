import express from "express";
import { db } from "../db.js";
import { requireRole } from "../middleware/auth.js";

const router = express.Router();

const STATUSES = ["Available", "Loading", "In Transit", "Maintenance", "Idle"];
const canManage = requireRole(["owner", "dispatcher"]);

router.get("/", (req, res) => {
  const vehicles = db.prepare("SELECT * FROM vehicles ORDER BY vehicle_no").all();
  res.json(vehicles);
});

router.post("/", canManage, (req, res) => {
  const { vehicleNo, vehicleType, driverName, driverPhone, affiliatedCompany, capacityKg, status } =
    req.body || {};
  if (!vehicleNo) return res.status(400).json({ error: "vehicleNo is required" });
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${STATUSES.join(", ")}` });
  }
  try {
    const result = db
      .prepare(
        "INSERT INTO vehicles (vehicle_no, vehicle_type, driver_name, driver_phone, affiliated_company, capacity_kg, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        vehicleNo.trim(),
        vehicleType || null,
        driverName || null,
        driverPhone || null,
        affiliatedCompany || null,
        capacityKg || null,
        status || "Available"
      );
    const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(vehicle);
  } catch (err) {
    res.status(409).json({ error: "Vehicle number already exists" });
  }
});

router.patch("/:id", canManage, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Vehicle not found" });

  const { vehicleType, driverName, driverPhone, affiliatedCompany, capacityKg, status } = req.body || {};
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${STATUSES.join(", ")}` });
  }
  db.prepare(
    `UPDATE vehicles SET
      vehicle_type = COALESCE(?, vehicle_type),
      driver_name = COALESCE(?, driver_name),
      driver_phone = COALESCE(?, driver_phone),
      affiliated_company = COALESCE(?, affiliated_company),
      capacity_kg = COALESCE(?, capacity_kg),
      status = COALESCE(?, status)
     WHERE id = ?`
  ).run(
    vehicleType ?? null,
    driverName ?? null,
    driverPhone ?? null,
    affiliatedCompany ?? null,
    capacityKg ?? null,
    status ?? null,
    id
  );

  res.json(db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id));
});

router.delete("/:id", canManage, (req, res) => {
  db.prepare("DELETE FROM vehicles WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

export default router;
