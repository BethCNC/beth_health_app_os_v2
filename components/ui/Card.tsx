import clsx from "clsx";

export function Card({
  title,
  detail,
  children,
  className
}: {
  title: string;
  detail?: string;
  children?: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <section className={clsx("rounded-xl border border-[#CCD3DD] bg-white p-5 shadow-sm", className)}>
      <h2 className="text-2xl font-semibold leading-tight text-[#0F172A]">{title}</h2>
      {detail ? <p className="mt-1 text-base text-[#556273]">{detail}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
