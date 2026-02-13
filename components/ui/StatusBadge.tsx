import clsx from "clsx";

export function StatusBadge({ status }: { status: string }): React.JSX.Element {
  const normalized = status.toLowerCase();
  const style =
    normalized === "verified" || normalized === "approved"
      ? "border-[#A9DFC2] bg-[#E7F9EE] text-[#1E6A3E]"
      : normalized === "rejected"
        ? "border-[#F4B1B1] bg-[#FDF1F1] text-[#9B2323]"
        : "border-[#E8D3A1] bg-[#FFF8E8] text-[#916211]";

  return (
    <span className={clsx("inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide", style)}>
      {status}
    </span>
  );
}
