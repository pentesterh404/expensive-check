export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "CONFIRMED"
      ? "badge confirmed"
      : status === "UNPARSED"
        ? "badge unparsed"
        : "badge review";

  return <span className={cls}>{status}</span>;
}
