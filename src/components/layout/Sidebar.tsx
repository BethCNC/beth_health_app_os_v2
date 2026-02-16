const navItems = [
  "Dashboard",
  "Patients",
  "Schedule",
  "Messages",
  "Orders",
  "Reports",
  "Settings",
];

export default function Sidebar() {
  return (
    <aside className="flex min-h-screen flex-col gap-6 border-r border-slate-800 bg-slate-900 px-4 py-6 text-slate-100">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Personal EMR
        </div>
        <div className="mt-2 text-lg font-semibold">Chart Workspace</div>
      </div>
      <nav className="flex flex-col gap-1 text-sm">
        {navItems.map((item) => (
          <div
            key={item}
            className="rounded-md px-3 py-2 text-slate-200 transition hover:bg-slate-800 hover:text-white"
          >
            {item}
          </div>
        ))}
      </nav>
      <div className="mt-auto rounded-md border border-slate-800 bg-slate-950/40 px-3 py-3 text-xs text-slate-300">
        Epic-style shell only. Data wiring comes next.
      </div>
    </aside>
  );
}
