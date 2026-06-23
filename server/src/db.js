import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data", "erp.sqlite3");

export const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// node:sqlite's DatabaseSync has no built-in transaction helper (unlike
// better-sqlite3), so routes that need atomicity wrap statements in this.
export function withTransaction(fn) {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'dispatcher',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_no TEXT UNIQUE NOT NULL,
  vehicle_type TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  affiliated_company TEXT,
  capacity_kg REAL,
  status TEXT NOT NULL DEFAULT 'Available',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  gstin TEXT,
  address TEXT,
  payment_terms_days INTEGER NOT NULL DEFAULT 21,
  gate_contact_name TEXT,
  gate_contact_phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lrs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lr_no TEXT UNIQUE NOT NULL,
  lr_date TEXT NOT NULL,
  consignor_name TEXT NOT NULL,
  consignor_address TEXT,
  consignee_name TEXT NOT NULL,
  consignee_address TEXT,
  vehicle_id INTEGER REFERENCES vehicles(id),
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  invoice_no TEXT,
  delivery_at TEXT,
  eway_bill_no TEXT,
  freight_terms TEXT NOT NULL DEFAULT 'To Pay',
  amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Draft',
  remarks TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lr_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lr_id INTEGER NOT NULL REFERENCES lrs(id) ON DELETE CASCADE,
  no_of_pkgs TEXT,
  said_to_contain TEXT,
  weight_kg TEXT,
  rate_per_kg TEXT,
  freight_amount TEXT,
  remarks TEXT,
  received_qty TEXT,
  item_condition TEXT,
  receiving_remarks TEXT
);

CREATE TABLE IF NOT EXISTS lr_status_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lr_id INTEGER NOT NULL REFERENCES lrs(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  changed_by INTEGER REFERENCES users(id),
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

function migrate() {
  const vehicleColumns = db.prepare("PRAGMA table_info(vehicles)").all();
  if (!vehicleColumns.some((c) => c.name === "vehicle_type")) {
    db.exec("ALTER TABLE vehicles ADD COLUMN vehicle_type TEXT");
  }

  const itemColumns = db.prepare("PRAGMA table_info(lr_items)").all();
  if (!itemColumns.some((c) => c.name === "received_qty")) {
    db.exec("ALTER TABLE lr_items ADD COLUMN received_qty TEXT");
  }
  if (!itemColumns.some((c) => c.name === "item_condition")) {
    db.exec("ALTER TABLE lr_items ADD COLUMN item_condition TEXT");
  }
  if (!itemColumns.some((c) => c.name === "receiving_remarks")) {
    db.exec("ALTER TABLE lr_items ADD COLUMN receiving_remarks TEXT");
  }
}

// vehicle_no, vehicle_type, driver_name, driver_phone, affiliated_company, capacity_kg, status
const DEMO_VEHICLES = [
  ["MH-12-AB-1234", "Heavy Trailer • 22 Wheels", "Ramesh Patil", "9822011001", "Siddheshwer Transport", 9000, "In Transit"],
  ["DL-01-XY-9876", "Medium Carrier • 10 Wheels", "Suresh Yadav", "9822011002", "Siddheshwer Transport", 7500, "Available"],
  ["KA-05-PQ-5544", "Container Truck • 14 Wheels", "Vinod Naik", "9822011003", "Siddheshwer Transport", 12000, "Available"],
  ["MH-14-CC-1122", "Flatbed Trailer • 18 Wheels", "Anil Shinde", "9822011004", "Siddheshwer Transport", 9000, "Maintenance"],
  ["TN-09-MM-3333", "Heavy Trailer • 22 Wheels", "Mahesh Rao", "9822011005", "Siddheshwer Transport", 10000, "In Transit"],
  ["MH-04-JK-8821", "Heavy Trailer • 22 Wheels", "Rajesh Kumar", "9822011006", "Siddheshwer Transport", 16000, "Available"],
  ["KA-51-ME-4002", "Medium Carrier • 10 Wheels", "Suresh V.", "9822011007", "Siddheshwer Transport", 8000, "Available"],
  ["TN-01-AP-5567", "Container Truck • 14 Wheels", "Mohammad Aziz", "9822011008", "Siddheshwer Transport", 13000, "Available"],
  ["GJ-12-FF-9021", "Flatbed Trailer • 18 Wheels", "Arjun Rathore", "9822011009", "Siddheshwer Transport", 11000, "Available"],
  ["UP-32-BK-1029", "Box Truck • 6 Wheels", "Devendra Singh", "9822011010", "Siddheshwer Transport", 5000, "Available"],
  ["HR-55-SS-0032", "Mini Truck • 4 Wheels", "Naveen Yadav", "9822011011", "Siddheshwer Transport", 2500, "Available"],
  ["RJ-14-CD-3344", "Heavy Trailer • 22 Wheels", "Bhupendra Singh", "9822011012", "Siddheshwer Transport", 16000, "Available"],
  ["PB-08-GH-7788", "Container Truck • 12 Wheels", "Gurpreet Singh", "9822011013", "Siddheshwer Transport", 12000, "Available"],
  ["WB-06-JK-1122", "Medium Carrier • 10 Wheels", "Subrata Roy", "9822011014", "Siddheshwer Transport", 8000, "Available"],
  ["AP-09-LM-4455", "Flatbed Trailer • 16 Wheels", "Krishna Reddy", "9822011015", "Siddheshwer Transport", 10000, "Available"],
];

function seedIfEmpty() {
  const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (userCount === 0) {
    const insertUser = db.prepare(
      "INSERT INTO users (employee_id, name, password_hash, role) VALUES (?, ?, ?, ?)"
    );
    insertUser.run("EMP-4920", "Dispatch Admin", bcrypt.hashSync("dispatch123", 10), "owner");
    insertUser.run("SEC-1001", "Gate Security", bcrypt.hashSync("gate123", 10), "security");
    insertUser.run("REC-2001", "Warehouse Receiver", bcrypt.hashSync("receive123", 10), "receiver");
  }

  const vehicleCount = db.prepare("SELECT COUNT(*) AS c FROM vehicles").get().c;
  if (vehicleCount === 0) {
    const insertVehicle = db.prepare(
      "INSERT INTO vehicles (vehicle_no, vehicle_type, driver_name, driver_phone, affiliated_company, capacity_kg, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    for (const v of DEMO_VEHICLES) insertVehicle.run(...v);
  }

  const clientCount = db.prepare("SELECT COUNT(*) AS c FROM clients").get().c;
  if (clientCount === 0) {
    const insertClient = db.prepare(
      "INSERT INTO clients (name, gstin, address, payment_terms_days, gate_contact_name, gate_contact_phone) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const clients = [
      ["Kalyani Maxion Wheels", null, null, 21, null, null],
      ["Mercedes Benz", null, null, 21, null, null],
      ["Hitachi", null, null, 21, null, null],
    ];
    for (const c of clients) insertClient.run(...c);
  }
}

migrate();
seedIfEmpty();
