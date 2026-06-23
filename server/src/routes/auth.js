import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db.js";
import { JWT_SECRET } from "../middleware/auth.js";

const router = express.Router();

router.post("/login", (req, res) => {
  const { employeeId, password } = req.body || {};
  if (!employeeId || !password) {
    return res.status(400).json({ error: "Employee ID and password are required" });
  }

  const user = db
    .prepare("SELECT * FROM users WHERE employee_id = ?")
    .get(employeeId.trim());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid employee ID or password" });
  }

  const token = jwt.sign(
    { id: user.id, employeeId: user.employee_id, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({
    token,
    user: { id: user.id, employeeId: user.employee_id, name: user.name, role: user.role },
  });
});

export default router;
