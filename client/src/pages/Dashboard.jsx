import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import OfficeHeader from "../components/OfficeHeader";

function todayLocalDate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.lrs
      .summary()
      .then(setSummary)
      .catch((err) => setError(err.message));
    api.lrs
      .reconciliationSummary()
      .then(setPayments)
      .catch(() => {});
  }, []);

  const receivedCount = payments?.rows.filter((r) => r.settlementStatus === "Paid").length ?? 0;
  const pendingAfter21 = payments?.rows.filter((r) => r.settlementStatus === "Overdue") ?? [];
  const outstanding = payments?.rows.filter((r) => r.settlementStatus !== "Paid") ?? [];

  function daysRemaining(dueDate) {
    const ms = new Date(dueDate) - new Date(todayLocalDate());
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="flex-1 flex flex-col">
      <OfficeHeader />
      <div className="p-lg md:p-xxl space-y-xxl">
        {error && <p className="text-error">{error}</p>}

        <section className="relative rounded-2xl overflow-hidden p-xl md:p-xxl flex flex-col md:flex-row justify-between items-center border border-hairline shadow-sm bg-gradient-to-br from-primary-fixed/40 via-secondary-container/30 to-canvas-cream/30">
          <div className="max-w-2xl text-center md:text-left mb-lg md:mb-0">
            <h2 className="text-4xl font-semibold text-ink-secondary mb-sm">
              Good morning, {user?.name?.split(" ")[0] || "Dispatch"}.
            </h2>
            <p className="text-base text-on-surface-variant mb-lg">
              {summary
                ? `You have ${summary.activeTrips} trips in transit right now${
                    summary.disputed ? ` and ${summary.disputed} disputed LR(s) needing attention` : ""
                  }.`
                : "Loading fleet status…"}
            </p>
            <button
              onClick={() => navigate("/lrs/new")}
              className="bg-primary hover:bg-primary-press text-on-primary rounded-full shadow-md transition-all flex items-center justify-center gap-sm mx-auto md:mx-0 py-lg px-huge text-lg w-full md:w-fit font-medium"
            >
              📄 Create New Lorry Receipt
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-md md:gap-xl md:grid-cols-3">
          <MetricCard
            label="Active Trips"
            value={summary?.activeTrips ?? "—"}
            hint="Currently in transit"
            tone="primary"
          />
          <MetricCard
            label="Disputed LRs"
            value={summary?.disputed ?? "—"}
            hint={summary?.disputed ? "Action needed" : "All clear"}
            tone={summary?.disputed ? "warn" : "neutral"}
          />
          <MetricCard
            label="Total LRs Today"
            value={summary?.totalToday ?? "—"}
            hint={`${summary?.drafts ?? 0} drafts pending`}
            tone="neutral"
          />
        </section>

        <section className="bg-surface rounded-xl border border-hairline p-lg">
          <div className="flex justify-between items-center mb-md">
            <h3 className="text-lg text-ink-secondary font-semibold">Payments Received</h3>
            <span className="text-xs text-on-surface-variant">Read-only — Receiver handles payment release</span>
          </div>
          <div className="grid grid-cols-2 gap-md mb-md">
            <div className="rounded-lg bg-emerald-600/10 px-lg py-md">
              <p className="text-xs text-emerald-700 uppercase tracking-wider font-semibold">Received</p>
              <p className="text-2xl font-semibold text-emerald-700 mt-xs">{receivedCount}</p>
              <p className="text-xs text-emerald-700/70 mt-xs">Paid within terms</p>
            </div>
            <div className="rounded-lg bg-error-container/60 px-lg py-md">
              <p className="text-xs text-ruby uppercase tracking-wider font-semibold">Pending after 21 days</p>
              <p className="text-2xl font-semibold text-ruby mt-xs">{pendingAfter21.length}</p>
              <p className="text-xs text-ruby/80 mt-xs">
                {pendingAfter21.length
                  ? `₹${pendingAfter21.reduce((sum, r) => sum + r.amount, 0).toLocaleString("en-IN")} overdue`
                  : "None overdue"}
              </p>
            </div>
          </div>

          {outstanding.length > 0 && (
            <div className="overflow-x-auto border-t border-hairline pt-md">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="text-xs text-on-surface-variant uppercase tracking-wider">
                    <th className="py-xs pr-md">LR No.</th>
                    <th className="py-xs pr-md">Consignor</th>
                    <th className="py-xs pr-md">Amount</th>
                    <th className="py-xs pr-md">Due Date</th>
                    <th className="py-xs pr-md">Days Remaining to Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {outstanding.map((row) => {
                    const days = daysRemaining(row.dueDate);
                    return (
                      <tr key={row.id}>
                        <td className="py-sm pr-md font-medium text-primary">#{row.lrNo}</td>
                        <td className="py-sm pr-md text-on-surface-variant">{row.consignorName}</td>
                        <td className="py-sm pr-md font-medium">₹{Number(row.amount).toLocaleString("en-IN")}</td>
                        <td className="py-sm pr-md text-on-surface-variant">{row.dueDate}</td>
                        <td className="py-sm pr-md font-semibold">
                          {days > 0 ? (
                            <span className="text-on-surface-variant">{days} day{days === 1 ? "" : "s"}</span>
                          ) : days === 0 ? (
                            <span className="text-lemon">Due today</span>
                          ) : (
                            <span className="text-ruby">Overdue by {Math.abs(days)} day{Math.abs(days) === 1 ? "" : "s"}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-surface rounded-xl border border-hairline overflow-hidden flex flex-col">
          <div className="p-lg border-b border-hairline flex justify-between items-center bg-surface-bright">
            <h3 className="text-lg text-ink-secondary font-semibold">Recent Lorry Receipts</h3>
            <button
              onClick={() => navigate("/lrs")}
              className="text-sm text-primary hover:text-primary-press underline underline-offset-4 font-medium"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-canvas-soft border-b border-hairline text-xs text-on-surface-variant uppercase tracking-wider">
                  <th className="py-sm px-lg">LR No.</th>
                  <th className="py-sm px-lg">Date</th>
                  <th className="py-sm px-lg">Consignor</th>
                  <th className="py-sm px-lg">From</th>
                  <th className="py-sm px-lg">To</th>
                  <th className="py-sm px-lg">Vehicle</th>
                  <th className="py-sm px-lg">Inv No.</th>
                  <th className="py-sm px-lg">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm text-ink-secondary divide-y divide-hairline">
                {summary?.recent?.length ? (
                  summary.recent.map((lr) => (
                    <tr
                      key={lr.id}
                      className="hover:bg-surface-container-low transition-colors cursor-pointer"
                      onClick={() => navigate(`/lrs/${lr.id}`)}
                    >
                      <td className="py-sm px-lg font-medium">{lr.lr_no}</td>
                      <td className="py-sm px-lg text-on-surface-variant">{lr.lr_date}</td>
                      <td className="py-sm px-lg">{lr.consignor_name}</td>
                      <td className="py-sm px-lg text-on-surface-variant">{lr.from_location}</td>
                      <td className="py-sm px-lg text-on-surface-variant">{lr.to_location}</td>
                      <td className="py-sm px-lg text-on-surface-variant">
                        {lr.vehicle?.vehicle_no || "—"}
                      </td>
                      <td className="py-sm px-lg text-on-surface-variant">{lr.invoice_no || "—"}</td>
                      <td className="py-sm px-lg">
                        <StatusBadge status={lr.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-lg px-lg text-center text-on-surface-variant">
                      No lorry receipts yet. Create your first one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint, tone }) {
  const hintColor = tone === "warn" ? "text-ruby" : tone === "primary" ? "text-emerald-600" : "text-on-surface-variant";
  return (
    <div className="bg-surface rounded-xl p-lg border border-hairline flex flex-col hover:shadow-sm transition-shadow">
      <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold mb-md">
        {label}
      </span>
      <div className="text-3xl text-ink-secondary font-semibold">{value}</div>
      <div className={`text-xs mt-xs font-medium ${hintColor}`}>{hint}</div>
    </div>
  );
}
