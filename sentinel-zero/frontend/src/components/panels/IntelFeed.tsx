import { useStore } from '../../store';

function formatTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function IntelFeed() {
  const { routes, news } = useStore();

  const healthyCount = routes.filter(r => r.status === 'healthy').length;
  const atRiskCount = routes.filter(r => r.status === 'at-risk').length;
  const criticalCount = routes.filter(r => r.status === 'disrupted').length;

  return (
    <div className="p-3">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-2 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded text-center">
          <div className="font-mono text-lg font-semibold text-[var(--healthy)]">{healthyCount}</div>
          <div className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wide">Healthy</div>
        </div>
        <div className="p-2 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded text-center">
          <div className="font-mono text-lg font-semibold text-[var(--at-risk)]">{atRiskCount}</div>
          <div className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wide">At Risk</div>
        </div>
        <div className="p-2 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded text-center">
          <div className="font-mono text-lg font-semibold text-[var(--critical)]">{criticalCount}</div>
          <div className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wide">Critical</div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between mb-2 pb-1 border-b border-[var(--border-subtle)]">
        <span className="font-mono text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
          Live Feed
        </span>
        <span className="px-1.5 py-0.5 bg-[var(--critical-dim)] rounded text-[9px] font-mono text-[var(--critical)]">
          {news.filter(n => n.severity === 'critical').length} new
        </span>
      </div>

      {/* News Cards */}
      <div className="flex flex-col gap-2">
        {news.map((item) => (
          <div
            key={item.id}
            className={`relative p-3 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded cursor-pointer hover:bg-[var(--bg-surface)] hover:border-[var(--border-default)] transition-all
              before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:rounded-l
              ${item.severity === 'critical' ? 'before:bg-[var(--critical)]' : ''}
              ${item.severity === 'warning' ? 'before:bg-[var(--at-risk)]' : ''}
              ${item.severity === 'info' ? 'before:bg-[var(--text-tertiary)]' : ''}
              ${item.severity === 'positive' ? 'before:bg-[var(--healthy)]' : ''}
            `}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[9px] text-[var(--text-quaternary)] uppercase tracking-wide">
                {item.source}
              </span>
              <span className="font-mono text-[9px] text-[var(--text-quaternary)]">
                {formatTime(item.timestamp)}
              </span>
            </div>
            <div className="text-xs font-medium text-[var(--text-primary)] leading-relaxed mb-2">
              {item.title}
            </div>
            <div className="flex gap-1 flex-wrap">
              {item.severity === 'critical' && (
                <span className="px-1.5 py-0.5 bg-[var(--critical-dim)] rounded text-[9px] font-mono text-[var(--critical)]">
                  Critical
                </span>
              )}
              {item.severity === 'warning' && (
                <span className="px-1.5 py-0.5 bg-[var(--at-risk-dim)] rounded text-[9px] font-mono text-[var(--at-risk)]">
                  Warning
                </span>
              )}
              <span className="px-1.5 py-0.5 bg-[var(--bg-elevated)] rounded text-[9px] font-mono text-[var(--text-tertiary)]">
                {item.region}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
