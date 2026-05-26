import { STATUS_LABELS } from "@/lib/api";

export default function StatusBadge({ status, testId }) {
  const cls = `badge badge-${(status || "EM_ANALISE").toLowerCase()}`;
  return (
    <span className={cls} data-testid={testId || "status-badge"}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
