export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls = `status-badge status-badge-${s}`;

  return <span className={cls}>{status.replace("_", " ")}</span>;
}
