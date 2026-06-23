import express from "express";
import { db, withTransaction } from "../db.js";
import { requireRole } from "../middleware/auth.js";

const router = express.Router();

const STATUSES = ["Draft", "In Transit", "Delivered", "Paid", "Disputed", "Cancelled"];

// Every legal state transition is listed explicitly with exactly who may
// perform it. Anything not listed here is not a legal transition at all,
// regardless of role — this is the authoritative check; the frontend's
// per-role button visibility is just a convenience on top of this.
const TRANSITIONS = {
  "Draft->In Transit": ["security"],
  "Draft->Cancelled": ["owner", "dispatcher"],
  "In Transit->Delivered": ["receiver"],
  "In Transit->Disputed": ["receiver"],
  "Delivered->Paid": ["receiver"],
  "Delivered->Disputed": ["owner", "dispatcher"],
  "Disputed->In Transit": ["owner", "dispatcher"],
  "Disputed->Delivered": ["owner", "dispatcher"],
  "Disputed->Cancelled": ["owner", "dispatcher"],
};

const VEHICLE_STATUS_BY_LR_STATUS = {
  "In Transit": "In Transit",
  Delivered: "Available",
  Paid: "Available",
  Disputed: "Available",
  Cancelled: "Available",
};

function serializeLr(row) {
  if (!row) return row;
  const items = db.prepare("SELECT * FROM lr_items WHERE lr_id = ? ORDER BY id").all(row.id);
  const statusLog = db
    .prepare("SELECT * FROM lr_status_log WHERE lr_id = ? ORDER BY changed_at")
    .all(row.id);
  const vehicle = row.vehicle_id
    ? db.prepare("SELECT * FROM vehicles WHERE id = ?").get(row.vehicle_id)
    : null;
  return { ...row, items, statusLog, vehicle };
}

function localDateString(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function nextLrNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `LR-${yy}${mm}-`;
  const row = db
    .prepare("SELECT COUNT(*) AS c FROM lrs WHERE lr_no LIKE ?")
    .get(`${prefix}%`);
  const seq = String(row.c + 101).padStart(3, "0");
  return `${prefix}${seq}`;
}

router.get("/", (req, res) => {
  const { status, dateFrom, dateTo, search, page = "1", pageSize = "10" } = req.query;

  const clauses = [];
  const params = [];
  if (status && status !== "All") {
    clauses.push("status = ?");
    params.push(status);
  }
  if (dateFrom) {
    clauses.push("lr_date >= ?");
    params.push(dateFrom);
  }
  if (dateTo) {
    clauses.push("lr_date <= ?");
    params.push(dateTo);
  }
  if (search) {
    clauses.push("(lr_no LIKE ? OR consignor_name LIKE ? OR invoice_no LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const total = db.prepare(`SELECT COUNT(*) AS c FROM lrs ${where}`).get(...params).c;

  const limit = Math.max(1, Math.min(100, parseInt(pageSize, 10) || 10));
  const offset = (Math.max(1, parseInt(page, 10) || 1) - 1) * limit;

  const rows = db
    .prepare(
      `SELECT * FROM lrs ${where} ORDER BY lr_date DESC, id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  res.json({
    data: rows.map(serializeLr),
    total,
    page: Number(page),
    pageSize: limit,
  });
});

router.get("/stats/summary", (req, res) => {
  const activeTrips = db
    .prepare("SELECT COUNT(*) AS c FROM lrs WHERE status = 'In Transit'")
    .get().c;
  const pendingPods = db
    .prepare("SELECT COUNT(*) AS c FROM lrs WHERE status = 'In Transit' AND delivery_at IS NOT NULL")
    .get().c;
  const today = localDateString(new Date());
  const totalToday = db
    .prepare("SELECT COUNT(*) AS c FROM lrs WHERE lr_date = ?")
    .get(today).c;
  const drafts = db.prepare("SELECT COUNT(*) AS c FROM lrs WHERE status = 'Draft'").get().c;
  const disputed = db.prepare("SELECT COUNT(*) AS c FROM lrs WHERE status = 'Disputed'").get().c;
  const pendingInvoices = db
    .prepare("SELECT COUNT(*) AS c FROM lrs WHERE status IN ('Delivered') AND (invoice_no IS NULL OR invoice_no = '')")
    .get().c;
  const thirtyDaysAgo = localDateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const revenue30d = db
    .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM lrs WHERE lr_date >= ? AND status != 'Cancelled'")
    .get(thirtyDaysAgo).total;
  // "Delayed": still in transit past its own dispatch day — a proxy in the
  // absence of a modeled ETA/expected-transit-time field.
  const delayed = db
    .prepare("SELECT COUNT(*) AS c FROM lrs WHERE status = 'In Transit' AND lr_date < ?")
    .get(today).c;
  const deliveredToday = db
    .prepare(
      `SELECT COUNT(*) AS c FROM lr_status_log
       WHERE status = 'Delivered' AND date(changed_at, 'localtime') = date('now', 'localtime')`
    )
    .get().c;
  const recent = db
    .prepare("SELECT * FROM lrs ORDER BY lr_date DESC, id DESC LIMIT 5")
    .all()
    .map(serializeLr);

  res.json({
    activeTrips,
    pendingPods,
    totalToday,
    drafts,
    disputed,
    pendingInvoices,
    revenue30d,
    delayed,
    deliveredToday,
    recent,
  });
});

router.get("/reconciliation/summary", (req, res) => {
  const lrs = db
    .prepare(
      `SELECT id, lr_no, lr_date, consignor_name, amount, status
       FROM lrs
       WHERE status NOT IN ('Draft', 'Cancelled')
       ORDER BY lr_date DESC, id DESC`
    )
    .all();
  const clients = db.prepare("SELECT name, payment_terms_days FROM clients").all();
  const termsByClient = new Map(clients.map((c) => [c.name.toLowerCase(), c.payment_terms_days]));

  const today = new Date();
  const rows = lrs.map((lr) => {
    const termsDays = termsByClient.get(lr.consignor_name?.toLowerCase()) ?? 21;
    const dueDate = new Date(lr.lr_date);
    dueDate.setDate(dueDate.getDate() + termsDays);

    let settlementStatus;
    if (lr.status === "Paid") settlementStatus = "Paid";
    else if (lr.status !== "Delivered") settlementStatus = "Waiting";
    else settlementStatus = today > dueDate ? "Overdue" : "Eligible";

    return {
      id: lr.id,
      lrNo: lr.lr_no,
      lrDate: lr.lr_date,
      consignorName: lr.consignor_name,
      amount: lr.amount,
      dueDate: localDateString(dueDate),
      settlementStatus,
    };
  });

  const totalReceivables = rows
    .filter((r) => r.settlementStatus !== "Paid")
    .reduce((sum, r) => sum + r.amount, 0);
  const pendingRelease = rows
    .filter((r) => r.settlementStatus === "Overdue")
    .reduce((sum, r) => sum + r.amount, 0);
  const activeCount = rows.filter((r) => r.settlementStatus !== "Paid").length;

  res.json({ totalReceivables, pendingRelease, activeCount, rows });
});

router.get("/gate/pending", (req, res) => {
  const rows = db
    .prepare(
      `SELECT lrs.id, lrs.lr_no, lrs.lr_date, lrs.consignee_name, lrs.to_location, lrs.created_at,
              vehicles.vehicle_no, vehicles.vehicle_type, vehicles.driver_name, vehicles.driver_phone
       FROM lrs
       JOIN vehicles ON vehicles.id = lrs.vehicle_id
       WHERE lrs.status = 'Draft'
       ORDER BY lrs.created_at ASC`
    )
    .all();
  res.json(rows);
});

router.get("/gate/log", (req, res) => {
  const { page = "1", pageSize = "10" } = req.query;
  const limit = Math.max(1, Math.min(100, parseInt(pageSize, 10) || 10));
  const offset = (Math.max(1, parseInt(page, 10) || 1) - 1) * limit;

  const total = db
    .prepare("SELECT COUNT(*) AS c FROM lr_status_log WHERE status = 'In Transit'")
    .get().c;

  const todayCount = db
    .prepare(
      `SELECT COUNT(*) AS c FROM lr_status_log
       WHERE status = 'In Transit' AND date(changed_at, 'localtime') = date('now', 'localtime')`
    )
    .get().c;

  const rows = db
    .prepare(
      `SELECT lr_status_log.changed_at, lr_status_log.note,
              lrs.id AS lr_id, lrs.lr_no, lrs.consignee_name, lrs.to_location,
              vehicles.vehicle_no, vehicles.driver_name,
              users.name AS verified_by
       FROM lr_status_log
       JOIN lrs ON lrs.id = lr_status_log.lr_id
       LEFT JOIN vehicles ON vehicles.id = lrs.vehicle_id
       LEFT JOIN users ON users.id = lr_status_log.changed_by
       WHERE lr_status_log.status = 'In Transit'
       ORDER BY lr_status_log.changed_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset);

  res.json({ data: rows, total, todayCount, page: Number(page), pageSize: limit });
});

router.get("/delivery/pending", (req, res) => {
  const rows = db
    .prepare(
      `SELECT lrs.id, lrs.lr_no, lrs.lr_date, lrs.consignor_name, lrs.from_location, lrs.to_location,
              lrs.updated_at,
              vehicles.vehicle_no, vehicles.vehicle_type, vehicles.driver_name, vehicles.driver_phone
       FROM lrs
       LEFT JOIN vehicles ON vehicles.id = lrs.vehicle_id
       WHERE lrs.status = 'In Transit'
       ORDER BY lrs.updated_at ASC`
    )
    .all();
  res.json(rows);
});

router.get("/delivery/log", (req, res) => {
  const { page = "1", pageSize = "10" } = req.query;
  const limit = Math.max(1, Math.min(100, parseInt(pageSize, 10) || 10));
  const offset = (Math.max(1, parseInt(page, 10) || 1) - 1) * limit;

  const total = db
    .prepare("SELECT COUNT(*) AS c FROM lr_status_log WHERE status IN ('Delivered', 'Disputed')")
    .get().c;

  const todayCount = db
    .prepare(
      `SELECT COUNT(*) AS c FROM lr_status_log
       WHERE status IN ('Delivered', 'Disputed') AND date(changed_at, 'localtime') = date('now', 'localtime')`
    )
    .get().c;

  const rows = db
    .prepare(
      `SELECT lr_status_log.status, lr_status_log.changed_at, lr_status_log.note,
              lrs.id AS lr_id, lrs.lr_no, lrs.consignor_name, lrs.from_location,
              vehicles.vehicle_no, vehicles.driver_name,
              users.name AS verified_by
       FROM lr_status_log
       JOIN lrs ON lrs.id = lr_status_log.lr_id
       LEFT JOIN vehicles ON vehicles.id = lrs.vehicle_id
       LEFT JOIN users ON users.id = lr_status_log.changed_by
       WHERE lr_status_log.status IN ('Delivered', 'Disputed')
       ORDER BY lr_status_log.changed_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset);

  res.json({ data: rows, total, todayCount, page: Number(page), pageSize: limit });
});

router.patch("/:id/items", requireRole(["receiver"]), (req, res) => {
  const { id } = req.params;
  const lr = db.prepare("SELECT * FROM lrs WHERE id = ?").get(id);
  if (!lr) return res.status(404).json({ error: "LR not found" });
  if (lr.status !== "In Transit") {
    return res.status(400).json({ error: "Receiving details can only be recorded while an LR is In Transit" });
  }

  const { items } = req.body || {};
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "items array is required" });
  }

  withTransaction(() => {
    const update = db.prepare(
      `UPDATE lr_items SET received_qty = ?, item_condition = ?, receiving_remarks = ?
       WHERE id = ? AND lr_id = ?`
    );
    for (const item of items) {
      update.run(
        item.receivedQty ?? null,
        item.itemCondition ?? null,
        item.receivingRemarks ?? null,
        item.id,
        id
      );
    }
  });

  res.json(serializeLr(db.prepare("SELECT * FROM lrs WHERE id = ?").get(id)));
});

router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM lrs WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "LR not found" });
  res.json(serializeLr(row));
});

router.post("/", requireRole(["owner", "dispatcher"]), (req, res) => {
  const {
    lrDate,
    consignorName,
    consignorAddress,
    consigneeName,
    consigneeAddress,
    vehicleId,
    fromLocation,
    toLocation,
    invoiceNo,
    deliveryAt,
    ewayBillNo,
    freightTerms,
    amount,
    remarks,
    items,
  } = req.body || {};

  if (!consignorName || !consigneeName || !fromLocation || !toLocation || !lrDate) {
    return res.status(400).json({
      error: "consignorName, consigneeName, fromLocation, toLocation, and lrDate are required",
    });
  }

  // Every LR starts as Draft, full stop — gate-out (Security) and delivery
  // (Receiver) checkpoints can't be skipped by creating an LR pre-advanced.
  const lrStatus = "Draft";
  const lrNo = nextLrNumber();

  const lrId = withTransaction(() => {
    const result = db
      .prepare(
        `INSERT INTO lrs
          (lr_no, lr_date, consignor_name, consignor_address, consignee_name, consignee_address,
           vehicle_id, from_location, to_location, invoice_no, delivery_at, eway_bill_no,
           freight_terms, amount, status, remarks, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        lrNo,
        lrDate,
        consignorName.trim(),
        consignorAddress || null,
        consigneeName.trim(),
        consigneeAddress || null,
        vehicleId || null,
        fromLocation.trim(),
        toLocation.trim(),
        invoiceNo || null,
        deliveryAt || null,
        ewayBillNo || null,
        freightTerms || "To Pay",
        amount || 0,
        lrStatus,
        remarks || null,
        req.user?.id || null
      );

    const lrId = result.lastInsertRowid;

    const insertItem = db.prepare(
      "INSERT INTO lr_items (lr_id, no_of_pkgs, said_to_contain, weight_kg, rate_per_kg, freight_amount, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    for (const item of items || []) {
      insertItem.run(
        lrId,
        item.noOfPkgs || null,
        item.saidToContain || null,
        item.weightKg || null,
        item.ratePerKg || null,
        item.freightAmount || null,
        item.remarks || null
      );
    }

    db.prepare(
      "INSERT INTO lr_status_log (lr_id, status, note, changed_by) VALUES (?, ?, ?, ?)"
    ).run(lrId, lrStatus, "LR created", req.user?.id || null);

    return lrId;
  });

  res.status(201).json(serializeLr(db.prepare("SELECT * FROM lrs WHERE id = ?").get(lrId)));
});

router.patch("/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body || {};
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${STATUSES.join(", ")}` });
  }
  const lr = db.prepare("SELECT * FROM lrs WHERE id = ?").get(id);
  if (!lr) return res.status(404).json({ error: "LR not found" });

  const allowedRoles = TRANSITIONS[`${lr.status}->${status}`];
  if (!allowedRoles) {
    return res.status(400).json({ error: `Cannot move an LR from ${lr.status} to ${status}` });
  }
  if (!allowedRoles.includes(req.user?.role)) {
    return res.status(403).json({
      error: `Only ${allowedRoles.join(" or ")} can move an LR from ${lr.status} to ${status}`,
    });
  }

  const RECEIVER_NOTE_BY_STATUS = {
    Delivered: "Delivery confirmed",
    Disputed: "Delivery disputed",
    Paid: "Payment received",
  };

  const resolvedNote =
    note ||
    (req.user?.role === "security"
      ? `Gate-out verified by ${req.user.name}`
      : req.user?.role === "receiver"
        ? `${RECEIVER_NOTE_BY_STATUS[status] || status} by ${req.user.name}`
        : null);

  withTransaction(() => {
    db.prepare("UPDATE lrs SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    db.prepare(
      "INSERT INTO lr_status_log (lr_id, status, note, changed_by) VALUES (?, ?, ?, ?)"
    ).run(id, status, resolvedNote, req.user?.id || null);

    if (lr.vehicle_id) {
      if (status === "In Transit") {
        db.prepare("UPDATE vehicles SET status = 'In Transit' WHERE id = ?").run(lr.vehicle_id);
      } else if (VEHICLE_STATUS_BY_LR_STATUS[status]) {
        db.prepare("UPDATE vehicles SET status = ? WHERE id = ?").run(
          VEHICLE_STATUS_BY_LR_STATUS[status],
          lr.vehicle_id
        );
      }
    }
  });

  res.json(serializeLr(db.prepare("SELECT * FROM lrs WHERE id = ?").get(id)));
});

router.patch("/:id", requireRole(["owner", "dispatcher"]), (req, res) => {
  const { id } = req.params;
  const lr = db.prepare("SELECT * FROM lrs WHERE id = ?").get(id);
  if (!lr) return res.status(404).json({ error: "LR not found" });

  const {
    consignorName,
    consignorAddress,
    consigneeName,
    consigneeAddress,
    vehicleId,
    fromLocation,
    toLocation,
    invoiceNo,
    deliveryAt,
    ewayBillNo,
    freightTerms,
    amount,
    remarks,
  } = req.body || {};

  db.prepare(
    `UPDATE lrs SET
      consignor_name = COALESCE(?, consignor_name),
      consignor_address = COALESCE(?, consignor_address),
      consignee_name = COALESCE(?, consignee_name),
      consignee_address = COALESCE(?, consignee_address),
      vehicle_id = COALESCE(?, vehicle_id),
      from_location = COALESCE(?, from_location),
      to_location = COALESCE(?, to_location),
      invoice_no = COALESCE(?, invoice_no),
      delivery_at = COALESCE(?, delivery_at),
      eway_bill_no = COALESCE(?, eway_bill_no),
      freight_terms = COALESCE(?, freight_terms),
      amount = COALESCE(?, amount),
      remarks = COALESCE(?, remarks),
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    consignorName ?? null,
    consignorAddress ?? null,
    consigneeName ?? null,
    consigneeAddress ?? null,
    vehicleId ?? null,
    fromLocation ?? null,
    toLocation ?? null,
    invoiceNo ?? null,
    deliveryAt ?? null,
    ewayBillNo ?? null,
    freightTerms ?? null,
    amount ?? null,
    remarks ?? null,
    id
  );

  res.json(serializeLr(db.prepare("SELECT * FROM lrs WHERE id = ?").get(id)));
});

export default router;
