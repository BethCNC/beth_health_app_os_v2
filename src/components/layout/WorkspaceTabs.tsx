type WorkspaceTabsProps = {
  tabs: readonly string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
};

export default function WorkspaceTabs({
  tabs,
  activeTab,
  onTabChange,
}: WorkspaceTabsProps) {
  return (
    <div className="border-b border-slate-200 bg-slate-50 px-6">
      <div className="flex gap-6" role="tablist" aria-label="Workspace tabs">
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab)}
              className={`border-b-2 px-1 py-3 text-sm font-medium transition ${
                isActive
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>
    </div>
  );
}
