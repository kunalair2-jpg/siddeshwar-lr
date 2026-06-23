import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import OfficeHeader from "../components/OfficeHeader";

function todayLocalDate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function daysRemaining(dueDate) {
  const ms = new Date(dueDate) - new Date(todayLocalDate());
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

const FILTERS = ["All", "Pending", "Paid"];

export default function Payments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState(null);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");

  useEffect(() => {
    api.lrs
      .reconciliationSummary()
      .then(setPayments)
      .catch((err) => setError(err.message));
  }, []);

  // "All the delivered transportation" — exclude LRs still in transit/drafted (settlementStatus
  // "Waiting" means not yet delivered), this page is only about LRs that have actually arrived.
  const delivered = useMemo(() => {
    const rows = (payments?.rows ?? []).filter((r) => r.settlementStatus !== "Waiting");
    return rows
      .map((r) => ({ ...r, days: daysRemaining(r.dueDate) }))
      .sort((a, b) => a.days - b.days);
  }, [payments]);

  const filtered = delivered.filter((r) => {
    if (filter === "Paid") return r.settlementStatus === "Paid";
    if (filter === "Pending") return r.settlementStatus !== "Paid";
    return true;
  });

  const totalReceived = delivered.filter((r) => r.settlementStatus === "Paid").length;
  const totalPending = delivered.filter((r) => r.settlementStatus !== "Paid").length;

  return (
    <div className="flex-1 flex flex-col">
      <OfficeHeader />
      <div className="p-lg md:p-xxl space-y-xl">
        <header>
          <h1 className="text-3xl font-semibold text-ink-secondary">Payments</h1>
          <p className="text-on-surface-variant text-sm mt-xs">
            All delivered transportation — payment received or pending after the 21-day (or
            client-specific) settlement term.
          </p>
        </header>

        {error && <p className="text-error">{error}</p>}

        <section className="grid grid-cols-2 gap-md max-w-md">
          <div className="rounded-lg bg-emerald-600/10 px-lg py-md">
            <p className="text-xs text-emerald-700 uppercase tracking-wider font-semibold">Paid</p>
            <p className="text-2xl font-semibold text-emerald-700 mt-xs">{totalReceived}</p>
          </div>
          <div className="rounded-lg bg-error-container/60 px-lg py-md">
            <p className="text-xs text-ruby uppercase tracking-wider font-semibold">Pending</p>
            <p className="text-2xl font-semibold text-ruby mt-xs">{totalPending}</p>
          </div>
        </section>

        <div className="flex gap-sm">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-md py-xs rounded-full text-sm font-medium border transition-colors ${
                filter === f
                  ? "bg-primary-fixed border-primary text-primary-deep"
                  : "border-hairline text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <section className="bg-surface rounded-xl border border-hairline overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-canvas-soft border-b border-hairline text-xs text-on-surface-variant uppercase tracking-wider">
                <th className="py-sm px-lg">LR No.</th>
                <th className="py-sm px-lg">Consignor</th>
                <th className="py-sm px-lg">Delivery Date</th>
                <th className="py-sm px-lg">Amount</th>
                <th className="py-sm px-lg">Due Date</th>
                <th className="py-sm px-lg">Days Remaining to Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filtered.length ? (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-surface-container-low transition-colors cursor-pointer"
                    onClick={() => navigate(`/lrs/${row.id}`)}
                  >
                    <td className="py-sm px-lg font-medium text-primary">#{row.lrNo}</td>
                    <td className="py-sm px-lg">{row.consignorName}</td>
                    <td className="py-sm px-lg text-on-surface-variant">{row.lrDate}</td>
                    <td className="py-sm px-lg font-medium">₹{Number(row.amount).toLocaleString("en-IN")}</td>
                    <td className="py-sm px-lg text-on-surface-variant">{row.dueDate}</td>
                    <td className="py-sm px-lg font-semibold">
                      {row.settlementStatus === "Paid" ? (
                        <span className="text-emerald-600">Paid</span>
                      ) : row.days <= 0 ? (
                        <span className="text-ruby">Pending</span>
                      ) : (
                        <span className="text-on-surface-variant">
                          {row.days} day{row.days === 1 ? "" : "s"} remaining
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-lg px-lg text-center text-on-surface-variant">
                    No delivered transportation matches this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
