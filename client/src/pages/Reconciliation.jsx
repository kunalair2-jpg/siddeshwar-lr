import { useEffect, useState } from "react";
import { api } from "../lib/api";

const STATUS_STYLE = {
  Overdue: "bg-error-container text-on-error-container",
  Eligible: "bg-secondary-container/50 text-secondary",
  Waiting: "bg-surface-container text-on-surface-variant",
  Paid: "bg-emerald-600/10 text-emerald-600",
};

export default function Reconciliation() {
  const [data, setData] = useState({ totalReceivables: 0, pendingRelease: 0, activeCount: 0, rows: [] });
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [held, setHeld] = useState(new Set());

  function reload() {
    api.lrs.reconciliationSummary().then(setData).catch((err) => setError(err.message));
  }
  useEffect(reload, []);

  async function markPaid(row) {
    setBusyId(row.id);
    setError("");
    try {
      await api.lrs.setStatus(row.id, "Paid");
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function toggleHold(id) {
    setHeld((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="p-lg md:p-xxl space-y-xl">
        <header className="flex justify-between items-start flex-wrap gap-md">
          <div>
            <h1 className="text-3xl font-semibold text-ink-secondary">Payment & Finance Tracking</h1>
            <p className="text-on-surface-variant text-sm mt-xs">
              Cycle: 21-Day Settlement (default) · computed from delivery date + client payment terms
            </p>
          </div>
          <div className="flex gap-md">
            <SummaryCard label="Total Receivables" value={`₹${Number(data.totalReceivables).toLocaleString("en-IN")}`} />
            <SummaryCard label="Pending Release" value={`₹${Number(data.pendingRelease).toLocaleString("en-IN")}`} tone="warn" />
          </div>
        </header>

        {error && <p className="text-error">{error}</p>}

        <section className="bg-surface rounded-xl border border-hairline overflow-hidden">
          <div className="px-lg py-md border-b border-hairline flex justify-between items-center bg-surface-bright">
            <h3 className="font-semibold text-ink-secondary text-sm uppercase tracking-wide">Live Settlement Track</h3>
            <span className="px-md py-xs bg-secondary-container/50 text-secondary text-xs font-bold rounded-full">
              {data.activeCount} Active LRs
            </span>
          </div>
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="text-xs text-on-surface-variant uppercase tracking-wider border-b border-hairline">
                <th className="px-lg py-sm">LR No</th>
                <th className="px-lg py-sm">Delivery Date</th>
                <th className="px-lg py-sm">Amount</th>
                <th className="px-lg py-sm">Due Date</th>
                <th className="px-lg py-sm">Status</th>
                <th className="px-lg py-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {data.rows.length ? (
                data.rows.map((row) => {
                  const isHeld = held.has(row.id);
                  const status = isHeld ? "Waiting" : row.settlementStatus;
                  return (
                    <tr key={row.id}>
                      <td className="px-lg py-md font-medium text-primary">#{row.lrNo}</td>
                      <td className="px-lg py-md text-on-surface-variant">{row.lrDate}</td>
                      <td className="px-lg py-md font-semibold">₹{Number(row.amount).toLocaleString("en-IN")}</td>
                      <td
                        className={`px-lg py-md ${
                          row.settlementStatus === "Overdue" ? "text-ruby font-semibold" : "text-on-surface-variant"
                        }`}
                      >
                        {row.dueDate}
                      </td>
                      <td className="px-lg py-md">
                        <span className={`px-md py-xxs rounded-full text-[11px] font-bold uppercase ${STATUS_STYLE[status]}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-lg py-md text-right">
                        {row.settlementStatus === "Paid" ? (
                          <span className="text-emerald-600 text-lg">✓</span>
                        ) : row.settlementStatus === "Waiting" ? (
                          <span className="text-on-surface-variant text-xs">Pending</span>
                        ) : (
                          <div className="flex justify-end gap-md text-xs font-semibold">
                            <button
                              disabled={busyId === row.id}
                              onClick={() => markPaid(row)}
                              className="text-primary hover:text-primary-press disabled:opacity-50"
                            >
                              {busyId === row.id ? "…" : "Pay"}
                            </button>
                            <span className="text-on-surface-variant">|</span>
                            <button onClick={() => toggleHold(row.id)} className="text-on-surface-variant hover:text-ruby">
                              {isHeld ? "Resume" : "Hold"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-lg py-xl text-center text-on-surface-variant">
                    No billable LRs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <p className="text-xs text-on-surface-variant bg-surface-container rounded-lg px-md py-sm">
          "Pay" marks the LR Paid for real. "Hold" is a local view-only toggle for now — it isn't
          persisted, so it resets if you reload.
        </p>
    </div>
  );
}

function SummaryCard({ label, value, tone }) {
  return (
    <div className="bg-surface rounded-xl border border-hairline px-lg py-md min-w-[180px]">
      <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">{label}</p>
      <p className={`text-xl font-semibold mt-xs ${tone === "warn" ? "text-ruby" : "text-ink-secondary"}`}>{value}</p>
    </div>
  );
}
