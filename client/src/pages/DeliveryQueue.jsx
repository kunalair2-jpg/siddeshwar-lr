import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

function maskPhone(phone) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length < 10) return phone;
  return `+91 ${digits.slice(0, 2)}XXX-XXXXX`;
}

export default function DeliveryQueue() {
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  const [recent, setRecent] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const reload = useCallback(() => {
    api.lrs.deliveryPending().then(setPending).catch((err) => setError(err.message));
    api.lrs
      .deliveryLog({ page: 1, pageSize: 5 })
      .then((res) => setRecent(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    reload();
    const poll = setInterval(reload, 15000);
    return () => clearInterval(poll);
  }, [reload]);

  async function quickAction(lr, status) {
    setBusyId(lr.id);
    setError("");
    try {
      await api.lrs.setStatus(lr.id, status);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const filtered = pending.filter((lr) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      lr.vehicle_no?.toLowerCase().includes(q) ||
      lr.lr_no?.toLowerCase().includes(q) ||
      lr.consignor_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-lg md:p-xxl space-y-xl">
      <header className="flex flex-wrap justify-between items-center gap-md">
        <h1 className="text-2xl font-semibold text-ink-secondary">Incoming Deliveries</h1>
        <input
          type="text"
          placeholder="Search vehicle or LR number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-xs"
        />
      </header>

      {error && <p className="text-error">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
        <section className="lg:col-span-2 bg-surface rounded-xl border border-hairline overflow-hidden">
          <div className="px-lg py-md border-b border-hairline flex justify-between items-center bg-surface-bright">
            <div className="flex items-center gap-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <h3 className="font-semibold text-ink-secondary uppercase tracking-tight text-sm">
                Awaiting Confirmation
              </h3>
            </div>
            <span className="px-md py-xs bg-primary-container text-on-primary text-xs font-bold rounded-full">
              {filtered.length} SHIPMENT{filtered.length === 1 ? "" : "S"} INBOUND
            </span>
          </div>

          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="text-xs text-on-surface-variant uppercase tracking-wider border-b border-hairline">
                <th className="px-lg py-sm">Vehicle</th>
                <th className="px-lg py-sm">Driver</th>
                <th className="px-lg py-sm">LR / From</th>
                <th className="px-lg py-sm text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filtered.length ? (
                filtered.map((lr) => (
                  <tr key={lr.id}>
                    <td className="px-lg py-md">
                      <div className="font-semibold text-ink-secondary">{lr.vehicle_no || "—"}</div>
                      <div className="text-xs text-on-surface-variant">{lr.vehicle_type || "—"}</div>
                    </td>
                    <td className="px-lg py-md">
                      <div>{lr.driver_name || "—"}</div>
                      <div className="text-xs text-on-surface-variant">{maskPhone(lr.driver_phone)}</div>
                    </td>
                    <td className="px-lg py-md">
                      <div className="font-medium text-primary">{lr.lr_no}</div>
                      <div className="text-xs text-on-surface-variant">
                        {lr.consignor_name} · {lr.from_location}
                      </div>
                    </td>
                    <td className="px-lg py-md text-right">
                      <div className="flex justify-end gap-xs flex-wrap">
                        <button
                          onClick={() => navigate(`/delivery/${lr.id}`)}
                          className="border border-primary text-primary rounded-full text-xs font-medium px-md py-sm hover:bg-primary hover:text-on-primary transition-all"
                        >
                          Inspect
                        </button>
                        <button
                          disabled={busyId === lr.id}
                          onClick={() => quickAction(lr, "Delivered")}
                          className="bg-primary hover:bg-primary-press text-on-primary text-xs font-medium px-md py-sm rounded-full transition-all disabled:opacity-60"
                        >
                          ✓ Mark Delivered
                        </button>
                        <button
                          disabled={busyId === lr.id}
                          onClick={() => quickAction(lr, "Disputed")}
                          className="border border-ruby text-ruby rounded-full text-xs font-medium px-md py-sm hover:bg-ruby hover:text-on-primary transition-all disabled:opacity-60"
                        >
                          ⚠ Report Issue
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-lg py-xl text-center text-on-surface-variant">
                    No shipments awaiting delivery confirmation right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <aside className="bg-brand-dark-900 rounded-xl overflow-hidden flex flex-col">
          <div className="px-lg py-md bg-white/5 border-b border-white/10">
            <h3 className="font-semibold text-white uppercase tracking-wide text-sm">
              Recent Deliveries
            </h3>
          </div>
          <div className="flex-1 p-lg space-y-sm">
            {recent.length ? (
              recent.map((log, i) => (
                <div key={i} className="bg-white/5 p-md rounded-lg border border-white/5">
                  <div className="flex justify-between items-start mb-xs">
                    <span className="text-xs font-bold text-primary-fixed">
                      {new Date(`${log.changed_at}Z`).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-xs py-0.5 rounded uppercase ${
                        log.status === "Delivered"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-ruby/20 text-ruby"
                      }`}
                    >
                      {log.status === "Delivered" ? "Delivered" : "Disputed"}
                    </span>
                  </div>
                  <div className="font-semibold text-white">{log.vehicle_no || "—"}</div>
                  <div className="text-xs text-white/60">
                    {log.lr_no} · {log.consignor_name}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-white/50 text-sm">No deliveries logged yet today.</p>
            )}
          </div>
          <Link
            to="/delivery/log"
            className="m-lg py-sm border border-white/20 text-white text-center font-medium rounded-xl hover:bg-white/5 transition-all text-sm"
          >
            View Full History
          </Link>
        </aside>
      </div>
    </div>
  );
}
