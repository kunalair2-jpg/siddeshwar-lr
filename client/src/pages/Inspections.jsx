import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function Inspections() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], total: 0, todayCount: 0, pageSize: 10 });
  const [error, setError] = useState("");

  useEffect(() => {
    api.lrs
      .deliveryLog({ page, pageSize: 10 })
      .then(setResult)
      .catch((err) => setError(err.message));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="p-lg md:p-xxl space-y-xl">
        <header>
          <h1 className="text-3xl font-semibold text-ink-secondary">Inspections</h1>
          <p className="text-on-surface-variant text-sm mt-xs">
            Your delivery verification history — past confirmations and disputes.
          </p>
        </header>

        {error && <p className="text-error">{error}</p>}

        <section className="bg-surface rounded-xl border border-hairline p-lg max-w-xs">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
            Verified Today
          </p>
          <div className="text-3xl font-semibold text-ink-secondary mt-xs">{result.todayCount}</div>
        </section>

        <section className="bg-surface rounded-xl border border-hairline overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-canvas-soft border-b border-hairline text-xs text-on-surface-variant uppercase tracking-wider">
                <th className="px-lg py-sm">Time</th>
                <th className="px-lg py-sm">LR No.</th>
                <th className="px-lg py-sm">Vehicle</th>
                <th className="px-lg py-sm">Consignor</th>
                <th className="px-lg py-sm">Confirmed By</th>
                <th className="px-lg py-sm">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {result.data.length ? (
                result.data.map((log, i) => (
                  <tr
                    key={i}
                    className="hover:bg-surface-container-low transition-colors cursor-pointer"
                    onClick={() => navigate(`/inspections/${log.lr_id}`)}
                  >
                    <td className="px-lg py-sm tabular-nums">
                      {new Date(`${log.changed_at}Z`).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-lg py-sm font-medium text-primary">{log.lr_no}</td>
                    <td className="px-lg py-sm">{log.vehicle_no || "—"}</td>
                    <td className="px-lg py-sm text-on-surface-variant">{log.consignor_name}</td>
                    <td className="px-lg py-sm text-on-surface-variant">{log.verified_by || "—"}</td>
                    <td className="px-lg py-sm">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                          log.status === "Delivered"
                            ? "bg-secondary-container/50 text-secondary"
                            : "bg-error-container text-on-error-container"
                        }`}
                      >
                        {log.status === "Delivered" ? "✓ Verified" : "⚠ Discrepancy"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-lg py-xl text-center text-on-surface-variant">
                    No inspections recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="flex justify-between items-center px-lg py-md border-t border-hairline text-sm text-on-surface-variant">
            <span>
              Showing {(page - 1) * result.pageSize + 1}–
              {Math.min(page * result.pageSize, result.total)} of {result.total}
            </span>
            <div className="flex items-center gap-sm">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-md py-xs rounded-lg border border-hairline disabled:opacity-40"
              >
                ‹
              </button>
              <span className="px-md py-xs rounded-lg bg-primary text-on-primary">{page}</span>
              <span>of {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-md py-xs rounded-lg border border-hairline disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>
        </section>
    </div>
  );
}
