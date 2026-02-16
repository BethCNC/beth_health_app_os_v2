type BadgeVariant = "neutral" | "warning" | "critical";

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, string> = {
  neutral: "border-slate-300 bg-slate-100 text-slate-700",
  warning: "border-amber-300 bg-amber-100 text-amber-800",
  critical: "border-rose-300 bg-rose-100 text-rose-800",
};

export default function Badge({ label, variant = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
        variantStyles[variant]
      }`}
    >
      {label}
    </span>
  );
}
