import type { ReactNode } from "react";

type KeyValueRowProps = {
  label: string;
  value: ReactNode;
  valueClassName?: string;
};

export default function KeyValueRow({
  label,
  value,
  valueClassName,
}: KeyValueRowProps) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 border-b border-slate-100 py-1 text-[12px] last:border-b-0">
      <div className="text-slate-500">{label}</div>
      <div className={valueClassName ?? "text-slate-800"}>{value}</div>
    </div>
  );
}
