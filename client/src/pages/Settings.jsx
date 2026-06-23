import { useEffect, useState } from "react";
import { api } from "../lib/api";
import OfficeHeader from "../components/OfficeHeader";

const VEHICLE_STATUSES = ["Available", "Loading", "In Transit", "Maintenance", "Idle"];

export default function Settings() {
  const [tab, setTab] = useState("vehicles");

  return (
    <div className="flex-1 flex flex-col">
      <OfficeHeader />
      <div className="p-lg md:p-xxl space-y-xl">
      <header>
        <h1 className="text-3xl font-semibold text-ink-secondary">Settings</h1>
        <p className="text-on-surface-variant text-sm mt-xs">Manage your fleet and client masters.</p>
      </header>

      <div className="flex gap-sm">
        <button
          onClick={() => setTab("vehicles")}
          className={`px-lg py-sm rounded-full text-sm font-medium border ${
            tab === "vehicles" ? "bg-primary-fixed border-primary text-primary-deep" : "border-hairline text-on-surface-variant"
          }`}
        >
          Vehicles
        </button>
        <button
          onClick={() => setTab("clients")}
          className={`px-lg py-sm rounded-full text-sm font-medium border ${
            tab === "clients" ? "bg-primary-fixed border-primary text-primary-deep" : "border-hairline text-on-surface-variant"
          }`}
        >
          Clients
        </button>
      </div>

      {tab === "vehicles" ? <VehiclesPanel /> : <ClientsPanel />}
      </div>
    </div>
  );
}

function VehiclesPanel() {
  const [vehicles, setVehicles] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    vehicleNo: "",
    vehicleType: "",
    driverName: "",
    driverPhone: "",
    affiliatedCompany: "",
    capacityKg: "",
  });

  function reload() {
    api.vehicles.list().then(setVehicles).catch((err) => setError(err.message));
  }
  useEffect(reload, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await api.vehicles.create(form);
      setForm({ vehicleNo: "", vehicleType: "", driverName: "", driverPhone: "", affiliatedCompany: "", capacityKg: "" });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleStatusChange(id, status) {
    await api.vehicles.update(id, { status });
    reload();
  }

  async function handleDelete(id) {
    if (!confirm("Remove this vehicle?")) return;
    await api.vehicles.remove(id);
    reload();
  }

  return (
    <div className="space-y-lg">
      {error && <p className="text-error">{error}</p>}
      <form onSubmit={handleAdd} className="bg-surface rounded-xl border border-hairline p-lg grid grid-cols-2 md:grid-cols-6 gap-md items-end">
        <input className="input" placeholder="Vehicle No." value={form.vehicleNo} onChange={(e) => setForm((f) => ({ ...f, vehicleNo: e.target.value }))} required />
        <input className="input" placeholder="Type (e.g. Heavy Trailer • 22 Wheels)" value={form.vehicleType} onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))} />
        <input className="input" placeholder="Driver Name" value={form.driverName} onChange={(e) => setForm((f) => ({ ...f, driverName: e.target.value }))} />
        <input className="input" placeholder="Driver Phone" value={form.driverPhone} onChange={(e) => setForm((f) => ({ ...f, driverPhone: e.target.value }))} />
        <input className="input" placeholder="Affiliated Company" value={form.affiliatedCompany} onChange={(e) => setForm((f) => ({ ...f, affiliatedCompany: e.target.value }))} />
        <button type="submit" className="px-lg py-sm rounded-full bg-primary text-on-primary font-medium">Add Vehicle</button>
      </form>

      <div className="bg-surface rounded-xl border border-hairline overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="text-xs text-on-surface-variant uppercase tracking-wider border-b border-hairline bg-canvas-soft">
              <th className="py-sm px-lg">Vehicle No.</th>
              <th className="py-sm px-lg">Type</th>
              <th className="py-sm px-lg">Driver</th>
              <th className="py-sm px-lg">Company</th>
              <th className="py-sm px-lg">Status</th>
              <th className="py-sm px-lg"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {vehicles.map((v) => (
              <tr key={v.id}>
                <td className="py-sm px-lg font-medium">{v.vehicle_no}</td>
                <td className="py-sm px-lg text-on-surface-variant">{v.vehicle_type || "—"}</td>
                <td className="py-sm px-lg text-on-surface-variant">{v.driver_name || "—"}</td>
                <td className="py-sm px-lg text-on-surface-variant">{v.affiliated_company || "—"}</td>
                <td className="py-sm px-lg">
                  <select
                    className="input-sm"
                    value={v.status}
                    onChange={(e) => handleStatusChange(v.id, e.target.value)}
                  >
                    {VEHICLE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-sm px-lg">
                  <button onClick={() => handleDelete(v.id)} className="text-error text-xs">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClientsPanel() {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", gstin: "", address: "", paymentTermsDays: 21 });

  function reload() {
    api.clients.list().then(setClients).catch((err) => setError(err.message));
  }
  useEffect(reload, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await api.clients.create(form);
      setForm({ name: "", gstin: "", address: "", paymentTermsDays: 21 });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remove this client?")) return;
    await api.clients.remove(id);
    reload();
  }

  return (
    <div className="space-y-lg">
      {error && <p className="text-error">{error}</p>}
      <form onSubmit={handleAdd} className="bg-surface rounded-xl border border-hairline p-lg grid grid-cols-2 md:grid-cols-5 gap-md items-end">
        <input className="input" placeholder="Client Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        <input className="input" placeholder="GSTIN" value={form.gstin} onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))} />
        <input className="input" placeholder="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
        <input
          className="input"
          type="number"
          placeholder="Payment Terms (days)"
          value={form.paymentTermsDays}
          onChange={(e) => setForm((f) => ({ ...f, paymentTermsDays: Number(e.target.value) }))}
        />
        <button type="submit" className="px-lg py-sm rounded-full bg-primary text-on-primary font-medium">Add Client</button>
      </form>

      <div className="bg-surface rounded-xl border border-hairline overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="text-xs text-on-surface-variant uppercase tracking-wider border-b border-hairline bg-canvas-soft">
              <th className="py-sm px-lg">Name</th>
              <th className="py-sm px-lg">GSTIN</th>
              <th className="py-sm px-lg">Address</th>
              <th className="py-sm px-lg">Payment Terms</th>
              <th className="py-sm px-lg"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {clients.map((c) => (
              <tr key={c.id}>
                <td className="py-sm px-lg font-medium">{c.name}</td>
                <td className="py-sm px-lg text-on-surface-variant">{c.gstin || "—"}</td>
                <td className="py-sm px-lg text-on-surface-variant">{c.address || "—"}</td>
                <td className="py-sm px-lg text-on-surface-variant">{c.payment_terms_days} days</td>
                <td className="py-sm px-lg">
                  <button onClick={() => handleDelete(c.id)} className="text-error text-xs">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
