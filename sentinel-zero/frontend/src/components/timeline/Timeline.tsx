import { useRef, useState } from 'react';
import { useStore } from '../../store';

export function Timeline() {
  const { viewMode, timelinePosition, setTimelinePosition, timelineEvents } = useStore();
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setTimelinePosition(pct);
  };

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC';
  };

  return (
    <footer
      className="flex items-center gap-4 px-4 h-11 bg-[var(--bg-base)] border-t border-[var(--border-subtle)]"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Playback Controls */}
      <div className="flex gap-0.5">
        {['⏮', '◀', '▶', '⏹'].map((icon, i) => (
          <button
            key={i}
            className={`w-7 h-7 flex items-center justify-center bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded text-[var(--text-tertiary)] text-[9px] cursor-pointer hover:bg-[var(--bg-surface)] hover:text-[var(--text-secondary)] transition-all ${
              i === 2 ? 'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)]' : ''
            }`}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Date/Time Display */}
      <div className="min-w-[120px]">
        <div className="text-xs font-medium text-[var(--text-primary)]">{formatDate()}</div>
        <div className="font-mono text-[10px] text-[var(--text-tertiary)]">{formatTime()}</div>
      </div>

      {/* Timeline Track */}
      <div ref={trackRef} className="flex-1 h-7 relative flex items-center">
        {/* Rail */}
        <div className="absolute left-0 right-0 h-0.5 bg-[var(--bg-elevated)] rounded" />

        {/* Progress */}
        <div
          className="absolute left-0 h-0.5 bg-[var(--text-tertiary)] rounded"
          style={{ width: `${timelinePosition}%` }}
        />

        {/* Event Markers */}
        {timelineEvents.map((event, i) => {
          const position = 20 + i * 20; // Simplified positioning
          return (
            <div
              key={event.id}
              className={`absolute top-1/2 w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 cursor-pointer ${
                event.severity === 'critical'
                  ? 'bg-[var(--critical)] shadow-[0_0_4px_var(--critical-glow)]'
                  : 'bg-[var(--at-risk)] shadow-[0_0_4px_var(--at-risk-glow)]'
              }`}
              style={{ left: `${position}%` }}
              title={event.title}
            />
          );
        })}

        {/* Handle */}
        <div
          className="absolute top-1/2 w-2.5 h-2.5 bg-[var(--text-secondary)] border-2 border-[var(--bg-base)] rounded-full -translate-x-1/2 -translate-y-1/2 cursor-grab hover:bg-[var(--text-primary)] z-10"
          style={{ left: `${timelinePosition}%` }}
          onMouseDown={handleMouseDown}
        />
      </div>

      {/* Mode Indicator */}
      <div
        className={`px-3 py-1 rounded text-[9px] font-mono font-medium uppercase tracking-wide ${
          viewMode === 'live'
            ? 'bg-[var(--healthy-dim)] text-[var(--healthy)] border border-[rgba(34,197,94,0.2)]'
            : viewMode === 'simulation'
              ? 'bg-[var(--at-risk-dim)] text-[var(--at-risk)] border border-[rgba(245,158,11,0.2)]'
              : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
        }`}
      >
        {viewMode}
      </div>
    </footer>
  );
}
