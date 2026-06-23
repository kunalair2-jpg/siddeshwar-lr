const STYLES = {
  Draft: "bg-surface-container text-on-surface-variant border border-hairline",
  "In Transit": "bg-primary-bg-subdued text-primary-deep",
  Delivered: "bg-secondary-container/50 text-secondary",
  Paid: "bg-emerald-600/10 text-emerald-600 border border-emerald-600/20",
  Disputed: "bg-error-container text-on-error-container",
  Cancelled: "bg-outline-variant/40 text-on-surface-variant",
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
        STYLES[status] || STYLES.Draft
      }`}
    >
      {status}
    </span>
  );
}
