import { useStore } from '../../store';
import { IntelFeed } from './IntelFeed';
import { NodeDetails } from './NodeDetails';
import { SimulationChat } from '../chat/SimulationChat';
import { SupplierFormPanel } from './SupplierFormPanel';

export function Sidebar() {
  const { sidebarTab, setSidebarTab, placementMode, setPlacementMode } = useStore();

  // Show supplier form when in placement mode
  if (placementMode) {
    return (
      <aside className="flex flex-col bg-[var(--bg-base)] border-l border-[var(--border-subtle)] overflow-hidden">
        <SupplierFormPanel onClose={() => setPlacementMode(false)} />
      </aside>
    );
  }

  return (
    <aside className="flex flex-col bg-[var(--bg-base)] border-l border-[var(--border-subtle)] overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-0.5 p-2 bg-[var(--bg-raised)] border-b border-[var(--border-subtle)]">
        {(['intel', 'details', 'chat'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSidebarTab(tab)}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              sidebarTab === tab
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setPlacementMode(true)}
            title="Add Node"
            className="w-6 h-6 flex items-center justify-center bg-transparent border border-[var(--border-subtle)] rounded text-[var(--text-tertiary)] text-[10px] hover:bg-cyan-400/10 hover:border-cyan-400/30 hover:text-cyan-400 transition-all"
          >
            +
          </button>
          <button className="w-6 h-6 flex items-center justify-center bg-transparent border border-[var(--border-subtle)] rounded text-[var(--text-tertiary)] text-[10px] hover:bg-[var(--bg-surface)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)] transition-all">
            ↻
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {sidebarTab === 'intel' && <IntelFeed />}
        {sidebarTab === 'details' && <NodeDetails />}
        {sidebarTab === 'chat' && <SimulationChat className="h-full" />}
      </div>
    </aside>
  );
}
