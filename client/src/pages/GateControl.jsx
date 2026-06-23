import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

function maskPhone(phone) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length < 10) return phone;
  return `+91 ${digits.slice(0, 2)}XXX-XXXXX`;
}

export default function GateControl() {
  const [pending, setPending] = useState([]);
  const [recent, setRecent] = useState([]);
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(new Date());
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const reload = useCallback(() => {
    api.lrs.gatePending().then(setPending).catch((err) => setError(err.message));
    api.lrs
      .gateLog({ page: 1, pageSize: 5 })
      .then((res) => setRecent(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    reload();
    const poll = setInterval(reload, 15000);
    return () => clearInterval(poll);
  }, [reload]);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  async function verify(lr) {
    setBusyId(lr.id);
    setError("");
    try {
      await api.lrs.setStatus(lr.id, "In Transit");
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
      lr.consignee_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-lg md:p-xxl space-y-xl">
      <header className="flex flex-wrap justify-between items-center gap-md">
        <h1 className="text-2xl font-semibold text-ink-secondary">Security Post — Gate 1</h1>
        <div className="flex items-center gap-lg">
          <input
            type="text"
            placeholder="Search vehicle or LR number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input max-w-xs"
          />
          <div className="text-right">
            <div className="text-xl font-semibold text-primary tabular-nums">
              {now.toLocaleTimeString("en-GB", { hour12: false })}
            </div>
            <div className="text-xs text-on-surface-variant uppercase tracking-wider">
              System Time (IST)
            </div>
          </div>
          <button className="p-sm text-on-surface-variant hover:bg-surface-container rounded-full transition-colors" title="Notifications">
            🔔
          </button>
          <button className="p-sm text-on-surface-variant hover:bg-surface-container rounded-full transition-colors" title="Settings">
            ⚙️
          </button>
        </div>
      </header>

      {error && <p className="text-error">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
        <section className="lg:col-span-2 bg-surface rounded-xl border border-hairline overflow-hidden">
          <div className="px-lg py-md border-b border-hairline flex justify-between items-center bg-surface-bright">
            <div className="flex items-center gap-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-ruby animate-pulse" />
              <h3 className="font-semibold text-ink-secondary uppercase tracking-tight text-sm">
                Pending Gate-Outs
              </h3>
            </div>
            <span className="px-md py-xs bg-primary-container text-on-primary text-xs font-bold rounded-full">
              {filtered.length} VEHICLE{filtered.length === 1 ? "" : "S"} WAITING
            </span>
          </div>

          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="text-xs text-on-surface-variant uppercase tracking-wider border-b border-hairline">
                <th className="px-lg py-sm">Vehicle Number</th>
                <th className="px-lg py-sm">Driver Details</th>
                <th className="px-lg py-sm">LR / Consignee</th>
                <th className="px-lg py-sm text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filtered.length ? (
                filtered.map((lr) => (
                  <tr key={lr.id}>
                    <td className="px-lg py-md">
                      <div className="font-semibold text-ink-secondary">{lr.vehicle_no}</div>
                      <div className="text-xs text-on-surface-variant">{lr.vehicle_type || "—"}</div>
                    </td>
                    <td className="px-lg py-md">
                      <div>{lr.driver_name || "—"}</div>
                      <div className="text-xs text-on-surface-variant">{maskPhone(lr.driver_phone)}</div>
                    </td>
                    <td className="px-lg py-md">
                      <div className="font-medium text-primary">{lr.lr_no}</div>
                      <div className="text-xs text-on-surface-variant">
                        {lr.consignee_name} · {lr.to_location}
                      </div>
                    </td>
                    <td className="px-lg py-md text-right">
                      <button
                        disabled={busyId === lr.id}
                        onClick={() => verify(lr)}
                        className="bg-primary hover:bg-primary-press text-on-primary font-medium py-sm px-lg rounded-full transition-all disabled:opacity-60"
                      >
                        {busyId === lr.id ? "Authorizing…" : "✓ Verify & Authorize"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-lg py-xl text-center text-on-surface-variant">
                    No vehicles waiting at the gate right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <aside className="bg-brand-dark-900 rounded-xl overflow-hidden flex flex-col">
          <div className="px-lg py-md bg-white/5 border-b border-white/10">
            <h3 className="font-semibold text-white uppercase tracking-wide text-sm">
              Recent Departures
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
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-xs py-0.5 rounded uppercase">
                      Cleared
                    </span>
                  </div>
                  <div className="font-semibold text-white">{log.vehicle_no}</div>
                  <div className="text-xs text-white/60">
                    {log.lr_no} · {log.consignee_name}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-white/50 text-sm">No departures logged yet today.</p>
            )}
          </div>
          <Link
            to="/gate/log"
            className="m-lg py-sm border border-white/20 text-white text-center font-medium rounded-xl hover:bg-white/5 transition-all text-sm"
          >
            View Full History
          </Link>
        </aside>
      </div>

      <footer className="flex flex-wrap justify-between items-center gap-md pt-lg border-t border-hairline text-xs text-on-surface-variant">
        <span>© 2026 Siddheshwer Transport. All rights reserved.</span>
        <div className="flex items-center gap-lg">
          <a href="#" className="hover:text-primary">Terms of Service</a>
          <a href="#" className="hover:text-primary">Privacy Policy</a>
          <span className="flex items-center gap-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> System Status
          </span>
        </div>
      </footer>
    </div>
  );
}
