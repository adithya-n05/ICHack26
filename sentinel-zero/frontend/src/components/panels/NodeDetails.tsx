import { useStore } from '../../store';

export function NodeDetails() {
  const { selectedNodeId, nodes, alternatives, routes, setSimulationActive } = useStore();

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="p-4 text-[var(--text-tertiary)] text-xs">
        Select a node or route on the map to view details.
      </div>
    );
  }

  const isAtRisk = selectedNode.riskScore > 60;
  const connectedRoutes = routes.filter(
    r => r.sourceId === selectedNodeId || r.destinationId === selectedNodeId
  );

  const handleSimulateReroute = (altId: string) => {
    setSimulationActive(true);
    console.log('Simulating reroute to:', altId);
  };

  return (
    <div className="p-3">
      {/* Header */}
      <div className="pb-3 mb-3 border-b border-[var(--border-subtle)]">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 mb-2 rounded text-[9px] font-mono font-medium uppercase tracking-wide
            ${isAtRisk
              ? 'bg-[var(--at-risk-dim)] text-[var(--at-risk)] border border-[rgba(245,158,11,0.2)]'
              : 'bg-[var(--healthy-dim)] text-[var(--healthy)] border border-[rgba(34,197,94,0.2)]'
            }
          `}
        >
          <span
            className={`w-1 h-1 rounded-full ${isAtRisk ? 'bg-[var(--at-risk)]' : 'bg-[var(--healthy)]'}`}
          />
          {selectedNode.type} · {isAtRisk ? 'At Risk' : 'Healthy'}
        </span>
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-0.5">
          {selectedNode.name}
        </h2>
        <p className="font-mono text-[11px] text-[var(--text-tertiary)]">
          {selectedNode.country} · {selectedNode.coordinates[1].toFixed(2)}°N, {selectedNode.coordinates[0].toFixed(2)}°E
        </p>
      </div>

      {/* Risk Gauge */}
      <div className="p-3 mb-3 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded">
        <div className="flex justify-between items-baseline mb-2">
          <span className="font-mono text-[9px] text-[var(--text-tertiary)] uppercase tracking-wide">
            Disruption Probability
          </span>
          <span
            className={`font-mono text-2xl font-semibold ${
              selectedNode.riskScore > 70
                ? 'text-[var(--critical)]'
                : selectedNode.riskScore > 40
                  ? 'text-[var(--at-risk)]'
                  : 'text-[var(--healthy)]'
            }`}
          >
            {selectedNode.riskScore}%
          </span>
        </div>
        <div className="h-1 bg-[var(--bg-elevated)] rounded mb-1 overflow-hidden">
          <div
            className={`h-full rounded transition-all duration-500 ${
              selectedNode.riskScore > 70
                ? 'bg-[var(--critical)] shadow-[0_0_8px_var(--critical-glow)]'
                : selectedNode.riskScore > 40
                  ? 'bg-[var(--at-risk)] shadow-[0_0_8px_var(--at-risk-glow)]'
                  : 'bg-[var(--healthy)] shadow-[0_0_8px_var(--healthy-glow)]'
            }`}
            style={{ width: `${selectedNode.riskScore}%` }}
          />
        </div>
        <div className="flex justify-between font-mono text-[8px] text-[var(--text-quaternary)]">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {selectedNode.metadata.leadTime && (
          <div className="p-2 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded">
            <div className="font-mono text-[9px] text-[var(--text-quaternary)] uppercase tracking-wide mb-0.5">
              Lead Time
            </div>
            <div className="text-base font-semibold text-[var(--text-primary)]">
              {selectedNode.metadata.leadTime}
              <span className="text-xs font-normal text-[var(--text-tertiary)] ml-0.5">days</span>
            </div>
          </div>
        )}
        {selectedNode.metadata.capacity && (
          <div className="p-2 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded">
            <div className="font-mono text-[9px] text-[var(--text-quaternary)] uppercase tracking-wide mb-0.5">
              Capacity
            </div>
            <div className="text-base font-semibold text-[var(--text-primary)]">
              {selectedNode.metadata.capacity}
              <span className="text-xs font-normal text-[var(--text-tertiary)] ml-0.5">%</span>
            </div>
          </div>
        )}
        {selectedNode.metadata.unitCost && (
          <div className="p-2 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded">
            <div className="font-mono text-[9px] text-[var(--text-quaternary)] uppercase tracking-wide mb-0.5">
              Unit Cost
            </div>
            <div className="text-base font-semibold text-[var(--text-primary)]">
              ${selectedNode.metadata.unitCost}
            </div>
          </div>
        )}
        {selectedNode.metadata.products && (
          <div className="p-2 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded">
            <div className="font-mono text-[9px] text-[var(--text-quaternary)] uppercase tracking-wide mb-0.5">
              Products
            </div>
            <div className="text-xs font-medium text-[var(--text-primary)]">
              {selectedNode.metadata.products.length} types
            </div>
          </div>
        )}
      </div>

      {/* Connected Routes */}
      {connectedRoutes.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-[var(--border-subtle)]">
            <span className="font-mono text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
              Connected Routes
            </span>
          </div>
          {connectedRoutes.map((route) => (
            <div
              key={route.id}
              className="flex items-center gap-2 p-2 mb-1 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  route.status === 'healthy'
                    ? 'bg-[var(--healthy)] shadow-[0_0_6px_var(--healthy-glow)]'
                    : route.status === 'at-risk'
                      ? 'bg-[var(--at-risk)] shadow-[0_0_6px_var(--at-risk-glow)]'
                      : 'bg-[var(--critical)] shadow-[0_0_6px_var(--critical-glow)]'
                }`}
              />
              <div className="flex-1">
                <div className="text-[11px] font-medium text-[var(--text-primary)]">
                  {route.name}
                </div>
                <div className="font-mono text-[9px] text-[var(--text-tertiary)]">
                  {route.transportMode} · {route.estimatedDays}d
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alternative Suppliers */}
      {isAtRisk && alternatives.length > 0 && (
        <div className="pt-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[var(--healthy)] shadow-[0_0_8px_var(--healthy-glow)] animate-pulse-slow" />
            <span className="font-mono text-[10px] font-medium text-[var(--healthy)] uppercase tracking-wide">
              Alternative Suppliers
            </span>
            <span className="ml-auto px-1.5 py-0.5 bg-[var(--healthy-dim)] rounded text-[9px] font-mono text-[var(--healthy)]">
              {alternatives.length} found
            </span>
          </div>

          {alternatives.map((alt) => (
            <div
              key={alt.id}
              className="relative p-3 mb-2 bg-[var(--healthy-dim)] border border-[rgba(34,197,94,0.15)] rounded cursor-pointer hover:bg-[rgba(34,197,94,0.15)] hover:border-[rgba(34,197,94,0.25)] transition-all"
            >
              <div className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center bg-[var(--healthy)] rounded font-mono text-[10px] font-bold text-[var(--bg-void)]">
                {alt.rank}
              </div>
              <div className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">
                {alt.name}
              </div>
              <div className="font-mono text-[10px] text-[var(--text-secondary)] mb-2">
                {alt.country}
              </div>
              <div className="flex gap-4 mb-2">
                <div>
                  <div className="font-mono text-[8px] text-[var(--text-tertiary)] uppercase">Risk</div>
                  <div className="font-mono text-xs font-medium text-[var(--healthy)]">{alt.riskScore}%</div>
                </div>
                <div>
                  <div className="font-mono text-[8px] text-[var(--text-tertiary)] uppercase">Cost</div>
                  <div className="font-mono text-xs font-medium text-[var(--healthy)]">+{alt.costDelta}%</div>
                </div>
                <div>
                  <div className="font-mono text-[8px] text-[var(--text-tertiary)] uppercase">Lead</div>
                  <div className="font-mono text-xs font-medium text-[var(--healthy)]">{alt.leadTimeDays}d</div>
                </div>
              </div>
              <button
                onClick={() => handleSimulateReroute(alt.id)}
                className="w-full py-2 bg-transparent border border-[var(--healthy)] rounded text-[var(--healthy)] text-[10px] font-medium hover:bg-[var(--healthy)] hover:text-[var(--bg-void)] transition-all"
              >
                Simulate Reroute
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
