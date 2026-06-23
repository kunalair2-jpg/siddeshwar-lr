import express from "express";
import { db } from "../db.js";
import { requireRole } from "../middleware/auth.js";

const router = express.Router();
const canManage = requireRole(["owner", "dispatcher"]);

router.get("/", (req, res) => {
  res.json(db.prepare("SELECT * FROM clients ORDER BY name").all());
});

router.post("/", canManage, (req, res) => {
  const { name, gstin, address, paymentTermsDays, gateContactName, gateContactPhone } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    const result = db
      .prepare(
        "INSERT INTO clients (name, gstin, address, payment_terms_days, gate_contact_name, gate_contact_phone) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(name.trim(), gstin || null, address || null, paymentTermsDays || 21, gateContactName || null, gateContactPhone || null);
    res.status(201).json(db.prepare("SELECT * FROM clients WHERE id = ?").get(result.lastInsertRowid));
  } catch {
    res.status(409).json({ error: "Client already exists" });
  }
});

router.patch("/:id", canManage, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Client not found" });

  const { gstin, address, paymentTermsDays, gateContactName, gateContactPhone } = req.body || {};
  db.prepare(
    `UPDATE clients SET
      gstin = COALESCE(?, gstin),
      address = COALESCE(?, address),
      payment_terms_days = COALESCE(?, payment_terms_days),
      gate_contact_name = COALESCE(?, gate_contact_name),
      gate_contact_phone = COALESCE(?, gate_contact_phone)
     WHERE id = ?`
  ).run(gstin ?? null, address ?? null, paymentTermsDays ?? null, gateContactName ?? null, gateContactPhone ?? null, id);

  res.json(db.prepare("SELECT * FROM clients WHERE id = ?").get(id));
});

router.delete("/:id", canManage, (req, res) => {
  db.prepare("DELETE FROM clients WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

export default router;
