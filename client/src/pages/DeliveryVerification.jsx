import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";

const CONDITIONS = ["OK", "Damaged", "Shortage"];

export default function DeliveryVerification() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lr, setLr] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.lrs
      .get(id)
      .then((data) => {
        setLr(data);
        setRows(
          data.items.map((item) => ({
            id: item.id,
            noOfPkgs: item.no_of_pkgs,
            saidToContain: item.said_to_contain,
            receivedQty: item.received_qty || item.no_of_pkgs || "",
            itemCondition: item.item_condition || "OK",
            receivingRemarks: item.receiving_remarks || "",
          }))
        );
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const hasIssue = useMemo(() => rows.some((r) => r.itemCondition !== "OK"), [rows]);

  function updateRow(rowId, field, value) {
    setRows((rs) => rs.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)));
  }

  async function complete(status) {
    setSaving(true);
    setError("");
    try {
      await api.lrs.updateItems(id, rows);
      await api.lrs.setStatus(id, status);
      navigate("/delivery");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !lr) {
    return (
      <div className="p-xxl">
        <p className="text-error">{error}</p>
        <Link to="/delivery" className="text-primary underline">
          Back to Incoming Deliveries
        </Link>
      </div>
    );
  }
  if (!lr) return <div className="p-xxl text-on-surface-variant">Loading…</div>;

  return (
    <div className="p-lg md:p-xxl space-y-xl max-w-4xl">
      <button onClick={() => navigate("/delivery")} className="text-sm text-primary hover:underline">
        ← Back to Incoming Deliveries
      </button>

      <header>
        <div className="flex items-center gap-sm mb-xs">
          <span className="px-md py-xs bg-primary-bg-subdued text-primary-deep rounded-full text-xs font-bold uppercase tracking-wide">
            In Transit
          </span>
          <span className="text-on-surface-variant text-sm">LR {lr.lr_no}</span>
        </div>
        <h1 className="text-3xl font-semibold text-ink-secondary">Delivery Verification</h1>
        <p className="text-on-surface-variant text-sm mt-xs">
          Verify material arrival and condition for {lr.lr_no}
        </p>
      </header>

      {error && <p className="text-error">{error}</p>}

      <section className="bg-surface rounded-xl border border-hairline p-lg grid grid-cols-1 md:grid-cols-2 gap-lg">
        <div>
          <h3 className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold mb-xs">
            Vehicle
          </h3>
          <p className="font-medium">{lr.vehicle?.vehicle_no || "Not assigned"}</p>
          <p className="text-sm text-on-surface-variant">{lr.vehicle?.driver_name}</p>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold mb-xs">
            Consignor
          </h3>
          <p className="font-medium">{lr.consignor_name}</p>
          <p className="text-sm text-on-surface-variant">{lr.consignor_address}</p>
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
            Invoice / E-way Bill
          </h3>
          <p className="text-sm">{lr.invoice_no || "—"} / {lr.eway_bill_no || "—"}</p>
        </div>
      </section>

      <section className="bg-surface rounded-xl border border-hairline overflow-hidden">
        <div className="px-lg py-md border-b border-hairline flex justify-between items-center bg-surface-bright">
          <h3 className="font-semibold text-ink-secondary">Material Information</h3>
          {hasIssue && (
            <span className="text-xs font-semibold text-ruby">⚠ Discrepancy flagged below</span>
          )}
        </div>
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="text-xs text-on-surface-variant uppercase tracking-wider border-b border-hairline">
              <th className="px-lg py-sm">Material</th>
              <th className="px-lg py-sm">Sent Qty</th>
              <th className="px-lg py-sm">Received Qty</th>
              <th className="px-lg py-sm">Condition</th>
              <th className="px-lg py-sm">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-lg py-md font-medium">{row.saidToContain || "—"}</td>
                <td className="px-lg py-md text-on-surface-variant">{row.noOfPkgs || "—"}</td>
                <td className="px-lg py-md">
                  <input
                    className={`input-sm w-24 ${row.itemCondition !== "OK" ? "border-ruby text-ruby" : ""}`}
                    value={row.receivedQty}
                    onChange={(e) => updateRow(row.id, "receivedQty", e.target.value)}
                  />
                </td>
                <td className="px-lg py-md">
                  <select
                    className="input-sm"
                    value={row.itemCondition}
                    onChange={(e) => updateRow(row.id, "itemCondition", e.target.value)}
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c === "OK" ? "✓ OK" : `⚠ ${c}`}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-lg py-md">
                  <input
                    className="input-sm"
                    placeholder="Optional note"
                    value={row.receivingRemarks}
                    onChange={(e) => updateRow(row.id, "receivingRemarks", e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="flex justify-end gap-md">
        <button
          disabled={saving}
          onClick={() => complete("Disputed")}
          className="px-xl py-md rounded-full border border-ruby text-ruby font-medium disabled:opacity-60"
        >
          ⚠ Report Issue (Disputed)
        </button>
        <button
          disabled={saving}
          onClick={() => complete("Delivered")}
          className="px-xl py-md rounded-full bg-primary hover:bg-primary-press text-on-primary font-medium disabled:opacity-60"
        >
          {saving ? "Saving…" : "✓ Complete Verification"}
        </button>
      </div>
    </div>
  );
}
