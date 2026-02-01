import { useAppStore } from '@/store';
import { GlowingBorder } from '@/components/ui/GlowingBorder';

const sentimentColors = {
  negative: 'text-red-400 bg-red-400/10 border-red-400/30',
  neutral: 'text-slate-400 bg-slate-400/10 border-slate-400/30',
  positive: 'text-green-400 bg-green-400/10 border-green-400/30',
};

const sentimentIcons = {
  negative: '↓',
  neutral: '→',
  positive: '↑',
};

export function NewsPanel() {
  const { headlines } = useAppStore();

  return (
    <GlowingBorder color="purple" intensity="low">
      <div className="bg-slate-900/95 backdrop-blur-sm p-4 rounded-lg">
        <h3 className="text-purple-400 font-mono text-sm mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
          LIVE INTELLIGENCE
        </h3>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {headlines.map((headline) => (
            <div
              key={headline.id}
              className="bg-slate-800/50 p-3 rounded border border-slate-700/50
                         hover:border-purple-500/30 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-2 mb-2">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded border ${sentimentColors[headline.sentiment]}`}
                >
                  {sentimentIcons[headline.sentiment]}
                </span>
                <span className="text-xs text-slate-500">{headline.source}</span>
              </div>
              <p className="text-slate-200 text-sm leading-snug mb-2">
                {headline.title}
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-400/70">{headline.region}</span>
                <span className="text-slate-500">
                  {headline.timestamp.toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlowingBorder>
  );
}
