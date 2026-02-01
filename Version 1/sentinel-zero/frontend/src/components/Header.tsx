import { useStore } from '../store';
import { ExportMenu } from './export/ExportMenu';

export function Header() {
  const { setSimulationActive, setSidebarTab, routes } = useStore();

  const atRiskRoutes = routes.filter(r => r.status === 'at-risk' || r.status === 'disrupted').length;

  const handleSimulate = () => {
    const input = document.querySelector<HTMLInputElement>('.command-input');
    if (input?.value.trim()) {
      setSimulationActive(true);
      setSidebarTab('chat');
      input.value = '';
    }
  };

  return (
    <header className="flex items-center gap-6 px-4 h-12 bg-[var(--bg-base)] border-b border-[var(--border-subtle)]">
      {/* Logo */}
      <div className="flex items-center gap-2 pr-4 border-r border-[var(--border-subtle)]">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--text-tertiary)] flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-[var(--healthy)] shadow-[0_0_8px_var(--healthy-glow)]" />
        </div>
        <span className="font-semibold text-sm tracking-wide text-[var(--text-primary)]">
          SENTINEL-ZERO
        </span>
      </div>

      {/* Status Bar */}
      <div className="flex gap-1">
        <div className="flex items-center gap-2 px-3 py-1 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--healthy)] shadow-[0_0_6px_var(--healthy-glow)]" />
          <span className="text-[var(--text-tertiary)] font-mono uppercase text-[9px] tracking-wide">Sys</span>
          <span className="text-[var(--text-secondary)] font-mono">Online</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--at-risk)] shadow-[0_0_6px_var(--at-risk-glow)] animate-pulse-slow" />
          <span className="text-[var(--text-tertiary)] font-mono uppercase text-[9px] tracking-wide">Alerts</span>
          <span className="text-[var(--text-secondary)] font-mono">7</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--critical)] shadow-[0_0_6px_var(--critical-glow)] animate-pulse-fast" />
          <span className="text-[var(--text-tertiary)] font-mono uppercase text-[9px] tracking-wide">Risk</span>
          <span className="text-[var(--text-secondary)] font-mono">{atRiskRoutes} routes</span>
        </div>
      </div>

      {/* Command Input */}
      <div className="flex-1 max-w-[520px]">
        <div className="flex items-center bg-[var(--bg-raised)] border border-[var(--border-default)] rounded overflow-hidden focus-within:border-[var(--border-strong)] transition-colors">
          <span className="px-2 py-1 bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">
            Simulate
          </span>
          <input
            type="text"
            className="command-input flex-1 px-3 py-2 bg-transparent border-none text-[var(--text-primary)] font-mono text-xs outline-none placeholder:text-[var(--text-quaternary)]"
            placeholder="What if 50% tariff on Taiwan semiconductors?"
          />
          <button
            onClick={handleSimulate}
            className="m-0.5 px-3 py-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded text-[var(--text-secondary)] font-mono text-[10px] font-medium uppercase cursor-pointer hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-all"
          >
            Run
          </button>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 ml-auto">
        <button className="flex items-center gap-2 px-3 py-1 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded text-[var(--text-secondary)] text-xs cursor-pointer hover:bg-[var(--bg-surface)] hover:border-[var(--border-default)] transition-all">
          <span>Electronics</span>
          <span className="text-[10px]">▾</span>
        </button>
        <ExportMenu />
      </div>
    </header>
  );
}
