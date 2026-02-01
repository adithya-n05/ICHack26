export type TariffHeatmapSummary = {
  label: string;
  radiusKm: number;
  count: number;
  avgSeverity: number;
  topTypesText: string;
  dateRange: string;
  locationText: string;
  entries: TariffEntry[];
};

export type TariffEntry = {
  id: string;
  title: string;
  leviedBy: string;
  target: string;
  description: string;
  dateRange: string;
};

interface TariffPanelProps {
  summary: TariffHeatmapSummary;
  onClose: () => void;
}

export function TariffPanel({ summary, onClose }: TariffPanelProps) {
  return (
    <aside className="absolute right-0 top-0 w-[350px] h-full bg-bg-secondary p-4 overflow-y-auto shadow-[-8px_0_24px_rgba(0,0,0,0.35)] ring-1 ring-white/5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-accent-amber font-mono text-lg font-bold">{summary.label}</h2>
        <button
          data-testid="tariff-panel-close"
          onClick={onClose}
          className="text-text-secondary hover:text-text-primary text-xl"
        >
          ×
        </button>
      </div>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Summary
        </h3>
        <div className="space-y-1 text-text-primary text-sm">
          <div>Events: {summary.count}</div>
          <div>Avg severity: {summary.avgSeverity.toFixed(1)}</div>
          <div>Radius: {Math.round(summary.radiusKm)} km</div>
          <div>Top types: {summary.topTypesText}</div>
          <div>Date range: {summary.dateRange}</div>
          <div>Location: {summary.locationText}</div>
        </div>
      </section>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Tariff Entries
        </h3>
        <div className="space-y-3">
          {summary.entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-bg-tertiary/40 rounded px-3 py-2 ring-1 ring-white/5"
            >
              <div className="text-text-primary text-sm font-mono">{entry.title}</div>
              <div className="text-text-secondary text-xs mt-1">Levied by: {entry.leviedBy}</div>
              <div className="text-text-secondary text-xs">Target: {entry.target}</div>
              <div className="text-text-secondary text-xs">Date: {entry.dateRange}</div>
              <p className="text-text-primary text-xs mt-2 leading-relaxed">{entry.description}</p>
            </div>
          ))}
          {summary.entries.length === 0 && (
            <div className="text-text-secondary text-xs">No tariff entries in range.</div>
          )}
        </div>
      </section>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Explanation
        </h3>
        <p className="text-text-primary text-sm leading-relaxed">
          Tariff clusters represent regions where governments have recently raised duties or tightened
          trade remedies on strategic goods such as electronics, metals, EV components, and agriculture.
          These measures are commonly linked to anti-dumping investigations, national security reviews,
          or retaliatory trade actions.
        </p>
        <p className="text-text-primary text-sm leading-relaxed mt-3">
          Operational impact typically includes higher landed costs, longer customs clearance, and
          increased pressure to qualify alternate suppliers or reroute flows through lower-duty corridors.
        </p>
      </section>
    </aside>
  );
}
