import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import OfficeHeader from "../components/OfficeHeader";

const NEXT_STATUS = {
  Draft: ["Cancelled"],
  "In Transit": [],
  Delivered: ["Paid", "Disputed"],
  Paid: [],
  Disputed: ["In Transit", "Delivered", "Cancelled"],
  Cancelled: [],
};

export default function LRDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lr, setLr] = useState(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  function reload() {
    api.lrs.get(id).then(setLr).catch((err) => setError(err.message));
  }

  useEffect(reload, [id]);

  async function transition(status) {
    setUpdating(true);
    setError("");
    try {
      const updated = await api.lrs.setStatus(id, status, `Marked ${status} from LR detail screen`);
      setLr(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  if (error && !lr) {
    return (
      <div className="p-xxl">
        <p className="text-error">{error}</p>
        <Link to="/lrs" className="text-primary underline">
          Back to Lorry Receipts
        </Link>
      </div>
    );
  }

  if (!lr) return <div className="p-xxl text-on-surface-variant">Loading…</div>;

  const nextOptions = NEXT_STATUS[lr.status] || [];

  return (
    <div className="flex-1 flex flex-col">
      <OfficeHeader />
      <div className="p-lg md:p-xxl space-y-xl max-w-4xl">
      <button onClick={() => navigate("/lrs")} className="text-sm text-primary hover:underline">
        ← Back to Lorry Receipts
      </button>

      <header className="flex justify-between items-start flex-wrap gap-md">
        <div>
          <h1 className="text-3xl font-semibold text-ink-secondary">{lr.lr_no}</h1>
          <p className="text-on-surface-variant text-sm mt-xs">{lr.lr_date}</p>
        </div>
        <StatusBadge status={lr.status} />
      </header>

      {error && <p className="text-error">{error}</p>}

      <section className="bg-surface rounded-xl border border-hairline p-lg grid grid-cols-1 md:grid-cols-2 gap-lg">
        <div>
          <h3 className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold mb-xs">
            Consignor
          </h3>
          <p className="font-medium">{lr.consignor_name}</p>
          <p className="text-sm text-on-surface-variant">{lr.consignor_address}</p>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold mb-xs">
            Consignee
          </h3>
          <p className="font-medium">{lr.consignee_name}</p>
          <p className="text-sm text-on-surface-variant">{lr.consignee_address}</p>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold mb-xs">
            Route
          </h3>
          <p className="font-medium">
            {lr.from_location} → {lr.to_location}
          </p>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold mb-xs">
            Vehicle
          </h3>
          <p className="font-medium">{lr.vehicle?.vehicle_no || "Not assigned"}</p>
          <p className="text-sm text-on-surface-variant">{lr.vehicle?.driver_name}</p>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold mb-xs">
            Invoice / E-way Bill
          </h3>
          <p className="text-sm">{lr.invoice_no || "—"} / {lr.eway_bill_no || "—"}</p>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold mb-xs">
            Freight
          </h3>
          <p className="text-sm">
            {lr.freight_terms} — ₹{Number(lr.amount).toLocaleString("en-IN")}
          </p>
        </div>
      </section>

      <section className="bg-surface rounded-xl border border-hairline overflow-hidden">
        <div className="p-lg border-b border-hairline">
          <h3 className="font-semibold text-ink-secondary">Goods</h3>
        </div>
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="text-xs text-on-surface-variant uppercase tracking-wider border-b border-hairline">
              <th className="py-sm px-lg">Pkgs</th>
              <th className="py-sm px-lg">Contents</th>
              <th className="py-sm px-lg">Weight</th>
              <th className="py-sm px-lg">Rate/Kg</th>
              <th className="py-sm px-lg">Freight</th>
              <th className="py-sm px-lg">Remarks</th>
              {lr.items.some((item) => item.received_qty) && (
                <>
                  <th className="py-sm px-lg">Received Qty</th>
                  <th className="py-sm px-lg">Condition</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {lr.items.map((item) => (
              <tr key={item.id}>
                <td className="py-sm px-lg">{item.no_of_pkgs}</td>
                <td className="py-sm px-lg">{item.said_to_contain}</td>
                <td className="py-sm px-lg">{item.weight_kg}</td>
                <td className="py-sm px-lg">{item.rate_per_kg}</td>
                <td className="py-sm px-lg">{item.freight_amount}</td>
                <td className="py-sm px-lg">{item.remarks}</td>
                {lr.items.some((i) => i.received_qty) && (
                  <>
                    <td className="py-sm px-lg">{item.received_qty || "—"}</td>
                    <td className="py-sm px-lg">
                      {item.item_condition && item.item_condition !== "OK" ? (
                        <span className="text-ruby font-medium">⚠ {item.item_condition}</span>
                      ) : (
                        item.item_condition || "—"
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-surface rounded-xl border border-hairline p-lg space-y-md">
        <h3 className="font-semibold text-ink-secondary">Status Timeline</h3>
        <ol className="space-y-md">
          {lr.statusLog.map((log) => (
            <li key={log.id} className="flex items-start gap-md">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">{log.status}</p>
                <p className="text-xs text-on-surface-variant">
                  {log.changed_at} {log.note ? `— ${log.note}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {lr.status === "Draft" && lr.vehicle_id && (
          <p className="text-xs text-on-surface-variant bg-surface-container rounded-lg px-md py-sm">
            Waiting on Security to confirm gate-out at the gate. Only Security can move this to
            In Transit — dispatchers can't approve their own vehicle's exit.
          </p>
        )}

        {lr.status === "In Transit" && (
          <p className="text-xs text-on-surface-variant bg-surface-container rounded-lg px-md py-sm">
            Waiting on the receiving warehouse to confirm delivery. Only the Receiver role can
            mark this Delivered or Disputed — dispatchers can't confirm their own delivery.
          </p>
        )}

        {nextOptions.length > 0 && (
          <div className="flex flex-wrap gap-sm pt-md border-t border-hairline">
            {nextOptions.map((statusOption) => (
              <button
                key={statusOption}
                disabled={updating}
                onClick={() => transition(statusOption)}
                className="px-lg py-sm rounded-full bg-primary hover:bg-primary-press text-on-primary text-sm font-medium disabled:opacity-60"
              >
                Mark {statusOption}
              </button>
            ))}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
