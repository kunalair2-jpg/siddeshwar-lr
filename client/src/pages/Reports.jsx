import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import OfficeHeader from "../components/OfficeHeader";

const STATUS_OPTIONS = ["All", "Draft", "In Transit", "Delivered", "Paid", "Disputed", "Cancelled"];

function todayLocalDate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function maskPhone(phone) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length < 10) return phone;
  return `+91 ${digits.slice(0, 2)}XXX-XXX${digits.slice(-2)}`;
}

function arrivalInfo(lr) {
  const today = todayLocalDate();
  if (lr.status === "In Transit") {
    return lr.lr_date < today
      ? { etaLabel: "Delayed", etaTone: "text-ruby", statusLabel: "LATE", statusTone: "bg-error-container text-error" }
      : { etaLabel: "Today", etaTone: "text-primary-deep", statusLabel: "ON-TIME", statusTone: "bg-surface-container-high text-primary" };
  }
  if (lr.status === "Draft") {
    return { etaLabel: "Awaiting gate-out", etaTone: "text-on-surface-variant", statusLabel: "PENDING", statusTone: "bg-lemon/10 text-lemon" };
  }
  if (lr.status === "Delivered" || lr.status === "Paid") {
    return { etaLabel: "Arrived", etaTone: "text-emerald-600", statusLabel: lr.status.toUpperCase(), statusTone: "bg-emerald-600/10 text-emerald-600" };
  }
  if (lr.status === "Disputed") {
    return { etaLabel: "Flagged", etaTone: "text-ruby", statusLabel: "DISPUTED", statusTone: "bg-error-container text-error" };
  }
  return { etaLabel: "—", etaTone: "text-on-surface-variant", statusLabel: lr.status.toUpperCase(), statusTone: "bg-surface-container text-on-surface-variant" };
}

export default function Reports() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [summary, setSummary] = useState(null);
  const [result, setResult] = useState({ data: [], total: 0, pageSize: 10 });
  const [tab, setTab] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const search = searchParams.get("search") || "";

  useEffect(() => {
    api.lrs.summary().then(setSummary).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    api.lrs
      .list({ status: statusFilter, search, page, pageSize: 10 })
      .then(setResult)
      .catch((err) => setError(err.message));
  }, [statusFilter, search, page]);

  const rows = useMemo(() => {
    return result.data.filter((lr) => {
      const info = arrivalInfo(lr);
      if (tab === "Critical") return info.statusLabel === "LATE" || info.statusLabel === "DISPUTED";
      if (tab === "Interstate") {
        const fromCity = lr.from_location?.split(/[\s,]+/)[0]?.toLowerCase();
        const toCity = lr.to_location?.split(/[\s,]+/)[0]?.toLowerCase();
        return fromCity && toCity && fromCity !== toCity;
      }
      return true;
    });
  }, [result.data, tab]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="flex-1 flex flex-col">
      <OfficeHeader />
      <div className="p-lg md:p-xxl space-y-xl">
        {error && <p className="text-error">{error}</p>}

        <section className="grid grid-cols-2 gap-md md:gap-xl md:grid-cols-4">
          <MetricCard label="In-Transit Total" value={summary?.activeTrips ?? "—"} icon="🚚" hint="Waiting for un-load sequence" />
          <MetricCard label="Expected Today" value={summary?.totalToday ?? "—"} icon="📅" hint={`${summary?.drafts ?? 0} drafts pending gate-out`} tone="primary" />
          <MetricCard label="Delayed" value={summary?.delayed ?? "—"} icon="⚠️" hint="Requires manual follow-up" tone="warn" />
          <MetricCard label="Delivered Today" value={summary?.deliveredToday ?? "—"} icon="✅" hint="Confirmed by receiving" tone="primary" />
        </section>

        <section className="bg-surface rounded-xl border border-hairline overflow-hidden">
          <div className="px-lg py-md border-b border-hairline flex flex-wrap justify-between items-center gap-md bg-surface-bright">
            <div className="flex items-center gap-lg">
              <h3 className="text-lg text-ink-secondary font-semibold">Live Arrivals</h3>
              <div className="flex gap-xs">
                {["All", "Critical", "Interstate"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-md py-xs rounded-full text-xs font-bold transition-colors ${
                      tab === t ? "bg-primary-fixed text-primary-deep border border-primary" : "text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input-sm w-44"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "Filter by Status" : s}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-canvas-soft border-b border-hairline text-xs text-on-surface-variant uppercase tracking-wider">
                  <th className="py-sm px-lg">LR No.</th>
                  <th className="py-sm px-lg">Vehicle No.</th>
                  <th className="py-sm px-lg">Driver Detail</th>
                  <th className="py-sm px-lg">From</th>
                  <th className="py-sm px-lg">ETA</th>
                  <th className="py-sm px-lg">Invoice Number</th>
                  <th className="py-sm px-lg">Status</th>
                  <th className="py-sm px-lg text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {rows.length ? (
                  rows.map((lr) => {
                    const info = arrivalInfo(lr);
                    return (
                      <tr key={lr.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-sm px-lg font-medium text-primary">{lr.lr_no}</td>
                        <td className="py-sm px-lg font-semibold">{lr.vehicle?.vehicle_no || "—"}</td>
                        <td className="py-sm px-lg">
                          <div>{lr.vehicle?.driver_name || "—"}</div>
                          <div className="text-xs text-on-surface-variant">{maskPhone(lr.vehicle?.driver_phone)}</div>
                        </td>
                        <td className="py-sm px-lg text-on-surface-variant">{lr.from_location}</td>
                        <td className="py-sm px-lg">
                          <div className={`font-semibold ${info.etaTone}`}>{lr.lr_date}</div>
                          <div className={`text-xs ${info.etaTone}`}>{info.etaLabel}</div>
                        </td>
                        <td className="py-sm px-lg text-on-surface-variant">{lr.invoice_no ? `#${lr.invoice_no}` : "—"}</td>
                        <td className="py-sm px-lg">
                          <span className={`px-md py-xxs rounded-full text-[11px] font-bold uppercase tracking-tight ${info.statusTone}`}>
                            {info.statusLabel}
                          </span>
                        </td>
                        <td className="py-sm px-lg text-right">
                          <button
                            onClick={() => navigate(`/lrs/${lr.id}`)}
                            className="px-md py-xs border border-primary text-primary rounded-full text-xs font-bold hover:bg-primary hover:text-on-primary transition-all"
                          >
                            Mark Arrived
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-lg px-lg text-center text-on-surface-variant">
                      No arrivals match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center px-lg py-md border-t border-hairline text-sm text-on-surface-variant">
            <span>
              Showing {(page - 1) * result.pageSize + 1}–{Math.min(page * result.pageSize, result.total)} of {result.total} arrivals
            </span>
            <div className="flex items-center gap-sm">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-md py-xs rounded-lg border border-hairline disabled:opacity-40">
                ‹
              </button>
              <span className="px-md py-xs rounded-lg bg-primary text-on-primary">{page}</span>
              <span>of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-md py-xs rounded-lg border border-hairline disabled:opacity-40">
                ›
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, hint, tone }) {
  const hintColor = tone === "warn" ? "text-ruby" : tone === "primary" ? "text-primary" : "text-on-surface-variant";
  return (
    <div className="bg-surface rounded-xl p-lg border border-hairline flex flex-col hover:shadow-sm transition-shadow">
      <div className="flex justify-between items-start mb-md">
        <span className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">{label}</span>
        <div className="p-xs bg-surface-container rounded-lg text-primary text-sm">{icon}</div>
      </div>
      <div className="text-3xl text-ink-secondary font-semibold">{value}</div>
      <div className={`text-xs mt-xs font-medium ${hintColor}`}>{hint}</div>
    </div>
  );
}
