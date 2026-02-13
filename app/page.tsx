import Link from "next/link";

export default function HomePage(): React.JSX.Element {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold">Beth Health OS v2</h1>
      <p className="text-base text-muted">
        Single source of truth for longitudinal records, verified extraction, timeline episodes, and clinician-ready
        snapshot sharing.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white" href="/dashboard">
          Open Patient Dashboard
        </Link>
        <Link className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold" href="/share">
          Manage Clinician Sharing
        </Link>
      </div>
    </div>
  );
}
