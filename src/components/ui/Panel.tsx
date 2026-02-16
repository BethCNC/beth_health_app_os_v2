import type { ReactNode } from "react";

type PanelCategory =
  | "demographics"
  | "problems"
  | "allergies"
  | "medications"
  | "labs"
  | "maintenance"
  | "navigation"
  | "default";

type PanelProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  category?: PanelCategory;
  children: ReactNode;
};

const categoryStyles: Record<PanelCategory, { header: string; border: string }> =
  {
    demographics: {
      header: "bg-amber-100 border-b-2 border-amber-300",
      border: "border-l-4 border-amber-400",
    },
    problems: {
      header: "bg-orange-100 border-b-2 border-orange-300",
      border: "border-l-4 border-orange-400",
    },
    allergies: {
      header: "bg-rose-100 border-b-2 border-rose-300",
      border: "border-l-4 border-rose-400",
    },
    medications: {
      header: "bg-blue-100 border-b-2 border-blue-300",
      border: "border-l-4 border-blue-400",
    },
    labs: {
      header: "bg-green-100 border-b-2 border-green-300",
      border: "border-l-4 border-green-400",
    },
    maintenance: {
      header: "bg-emerald-100 border-b-2 border-emerald-300",
      border: "border-l-4 border-emerald-400",
    },
    navigation: {
      header: "bg-slate-100 border-b border-slate-300",
      border: "border-l-4 border-slate-300",
    },
    default: {
      header: "bg-slate-50 border-b border-slate-200",
      border: "border-l-4 border-slate-300",
    },
  };

export default function Panel({
  title,
  subtitle,
  actions,
  category = "default",
  children,
}: PanelProps) {
  const styles = categoryStyles[category];

  return (
    <section className={`border border-slate-200 bg-white shadow-sm ${styles.border}`}>
      <header className={`flex items-start justify-between gap-2 px-3 py-2 ${styles.header}`}>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-700">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-0.5 text-[10px] text-slate-600">{subtitle}</div>
          ) : null}
        </div>
        {actions ? <div className="text-[10px] text-slate-600">{actions}</div> : null}
      </header>
      <div className="px-3 py-2">{children}</div>
    </section>
  );
}
