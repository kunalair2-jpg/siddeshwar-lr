import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function InspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lr, setLr] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.lrs.get(id).then(setLr).catch((err) => setError(err.message));
  }, [id]);

  if (error && !lr) {
    return (
      <div className="p-xxl">
        <p className="text-error">{error}</p>
        <Link to="/inspections" className="text-primary underline">
          Back to Inspections
        </Link>
      </div>
    );
  }
  if (!lr) return <div className="p-xxl text-on-surface-variant">Loading…</div>;

  const dispatchLog = lr.statusLog.find((l) => l.status === "In Transit");
  const deliveryLog = lr.statusLog.find((l) => l.status === "Delivered" || l.status === "Disputed");
  const isDisputed = deliveryLog?.status === "Disputed";

  return (
    <div className="p-lg md:p-xxl space-y-xl max-w-5xl">
        <button onClick={() => navigate("/inspections")} className="text-sm text-primary hover:underline">
          ← Back to Inspections
        </button>

        <header className="flex items-center justify-between flex-wrap gap-md">
          <div>
            <div className="flex items-center gap-sm mb-xs">
              <span
                className={`px-md py-xs rounded-full text-xs font-bold uppercase tracking-widest ${
                  isDisputed ? "bg-error-container text-on-error-container" : "bg-primary-bg-subdued text-primary-deep"
                }`}
              >
                {isDisputed ? "Discrepancy" : "Verified"}
              </span>
              <span className="text-on-surface-variant text-sm">LR No. {lr.lr_no}</span>
            </div>
            <h1 className="text-3xl font-semibold text-ink-secondary">Delivery Verification</h1>
            <p className="text-on-surface-variant text-sm mt-xs">
              Your inspection record for {lr.lr_no} (read-only history of what you recorded)
            </p>
          </div>
        </header>

        {error && <p className="text-error">{error}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
          <section className="lg:col-span-1 bg-surface rounded-xl border border-hairline overflow-hidden">
            <div className="bg-canvas-soft px-lg py-md border-b border-hairline">
              <h4 className="font-semibold text-ink-secondary text-sm">Shipment Details</h4>
            </div>
            <div className="p-lg space-y-lg">
              <div className="grid grid-cols-2 gap-lg">
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase mb-xs">LR No.</p>
                  <p className="font-bold text-ink-secondary">{lr.lr_no}</p>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase mb-xs">Invoice No.</p>
                  <p className="font-bold text-ink-secondary">{lr.invoice_no || "—"}</p>
                </div>
              </div>
              <div className="h-px bg-hairline" />
              <div className="flex items-center gap-md p-md rounded-lg bg-canvas-soft border border-hairline">
                <span className="text-lg">🚚</span>
                <div>
                  <p className="text-xs text-on-surface-variant">Vehicle</p>
                  <p className="font-bold text-ink-secondary text-sm">{lr.vehicle?.vehicle_no || "Not assigned"}</p>
                </div>
              </div>
              <div className="flex items-center gap-md p-md rounded-lg bg-canvas-soft border border-hairline">
                <span className="text-lg">👤</span>
                <div>
                  <p className="text-xs text-on-surface-variant">Driver</p>
                  <p className="font-bold text-ink-secondary text-sm">{lr.vehicle?.driver_name || "—"}</p>
                </div>
              </div>
              <div className="h-px bg-hairline" />
              <div className="relative pl-lg border-l-2 border-dashed border-primary/30 space-y-lg">
                <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-primary" />
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase">Origin</p>
                  <p className="font-bold text-sm">{lr.from_location}</p>
                  {dispatchLog && (
                    <p className="text-xs text-on-surface-variant">
                      Dispatched: {dispatchLog.changed_at}
                    </p>
                  )}
                </div>
                <div className="absolute -left-[7px] bottom-0 w-3 h-3 rounded-full bg-ruby" />
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase">Destination</p>
                  <p className="font-bold text-sm">{lr.to_location}</p>
                  {deliveryLog && (
                    <p className="text-xs text-on-surface-variant">
                      {deliveryLog.status}: {deliveryLog.changed_at}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="lg:col-span-2 space-y-xl">
            <div className="bg-surface rounded-xl border border-hairline overflow-hidden">
              <div className="bg-canvas-soft px-lg py-md border-b border-hairline">
                <h4 className="font-semibold text-ink-secondary text-sm">Material Information</h4>
              </div>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="text-[10px] text-on-surface-variant uppercase tracking-wider border-b border-hairline">
                    <th className="px-lg py-sm">Material</th>
                    <th className="px-lg py-sm text-right">Sent Qty</th>
                    <th className="px-lg py-sm text-right">Received Qty</th>
                    <th className="px-lg py-sm text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {lr.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-lg py-md font-bold text-ink-secondary">{item.said_to_contain || "—"}</td>
                      <td className="px-lg py-md text-right">{item.no_of_pkgs || "—"}</td>
                      <td className="px-lg py-md text-right font-bold">{item.received_qty || "—"}</td>
                      <td className="px-lg py-md text-center">
                        {item.item_condition === "OK" ? (
                          <span className="text-emerald-600">✓</span>
                        ) : item.item_condition ? (
                          <span className="text-ruby" title={item.item_condition}>
                            ⚠
                          </span>
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-brand-dark-900 text-white rounded-xl p-xl flex items-center justify-between">
              <div>
                <h4 className="font-semibold mb-xs">Receiving Confirmation</h4>
                {deliveryLog ? (
                  <p className="text-white/70 text-sm max-w-sm">{deliveryLog.note}</p>
                ) : (
                  <p className="text-white/70 text-sm max-w-sm">Not yet confirmed by the receiving warehouse.</p>
                )}
              </div>
              <span className="text-4xl opacity-30">✍️</span>
            </div>
          </section>
        </div>
    </div>
  );
}
