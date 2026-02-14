import Link from "next/link";

export default function HomePage(): React.JSX.Element {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 bg-[#0F172A] px-6 py-12">
      <h1 className="text-3xl font-semibold text-white">Beth Health OS v2</h1>
      <p className="text-base text-gray-300">
        Single source of truth for longitudinal records, verified extraction, timeline episodes, and clinician-ready
        snapshot sharing.
      </p>
      <div>
        <Link className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white" href="/snapshot">
          Open Records
        </Link>
      </div>
    </div>
  );
}
