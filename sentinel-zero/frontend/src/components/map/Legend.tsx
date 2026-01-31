export function Legend() {
  return (
    <div className="absolute bottom-4 left-4 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded p-3 min-w-[160px] z-20">
      {/* Risk Zones */}
      <div className="mb-3">
        <div className="font-mono text-[9px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-2 pb-1 border-b border-[var(--border-subtle)]">
          Risk Zones
        </div>
        <div className="flex flex-col gap-1">
          {[
            { color: 'bg-[var(--risk-war)]', label: 'War / Conflict' },
            { color: 'bg-[var(--risk-earthquake)]', label: 'Earthquake' },
            { color: 'bg-[var(--risk-storm)]', label: 'Storm / Cyclone' },
            { color: 'bg-[var(--risk-political)]', label: 'Political' },
            { color: 'bg-[var(--risk-tariff)]', label: 'Tariff Zone' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-3 h-1 rounded-sm ${color}`} />
              <span className="text-[10px] text-[var(--text-tertiary)]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Routes */}
      <div>
        <div className="font-mono text-[9px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-2 pb-1 border-b border-[var(--border-subtle)]">
          Routes
        </div>
        <div className="flex flex-col gap-1">
          {[
            { color: 'bg-[var(--healthy)]', glow: 'shadow-[0_0_4px_var(--healthy-glow)]', label: 'Healthy' },
            { color: 'bg-[var(--at-risk)]', glow: 'shadow-[0_0_4px_var(--at-risk-glow)]', label: 'At Risk' },
            { color: 'bg-[var(--critical)]', glow: 'shadow-[0_0_4px_var(--critical-glow)]', label: 'Disrupted' },
          ].map(({ color, glow, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-3 h-1 rounded-sm ${color} ${glow}`} />
              <span className="text-[10px] text-[var(--text-tertiary)]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
