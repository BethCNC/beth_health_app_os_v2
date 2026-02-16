type PatientHeaderProps = {
  name: string;
  dob: string;
  sexAtBirth: string;
  lastVisit: string;
  activeMeds: string;
  recentLabs: string;
};

export default function PatientHeader({
  name,
  dob,
  sexAtBirth,
  lastVisit,
  activeMeds,
  recentLabs,
}: PatientHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white px-6 py-4">
      <div className="text-lg font-semibold text-slate-900">{name}</div>
      <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
        <span>DOB {dob}</span>
        <span>Sex at birth {sexAtBirth}</span>
        <span>Last visit {lastVisit}</span>
        <span>Active meds {activeMeds}</span>
        <span>Recent labs {recentLabs}</span>
      </div>
    </header>
  );
}
