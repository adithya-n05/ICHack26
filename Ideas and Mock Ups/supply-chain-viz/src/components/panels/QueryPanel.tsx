import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAppStore } from '@/store';
import { GlowingBorder } from '@/components/ui/GlowingBorder';

const suggestedQueries = [
  'Trump tariffs on China',
  'Taiwan strait tensions',
  'Red Sea shipping disruption',
  'Semiconductor shortage',
];

export function QueryPanel() {
  const [query, setQuery] = useState('');
  const { analyzeQuery, isAnalyzing, impactAnalysis, clearImpact } = useAppStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      await analyzeQuery(query);
    }
  };

  return (
    <div className="space-y-4">
      <GlowingBorder color="cyan" intensity="low">
        <div className="bg-slate-900/95 backdrop-blur-sm p-4 rounded-lg">
          <h3 className="text-cyan-400 font-mono text-sm mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            GEOPOLITICAL QUERY
          </h3>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter scenario or rumor..."
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2
                         text-white placeholder-slate-500 focus:border-cyan-500
                         focus:ring-1 focus:ring-cyan-500/50 font-mono text-sm
                         outline-none transition-all"
            />
            <button
              type="submit"
              disabled={isAnalyzing || !query.trim()}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2 px-4
                         rounded font-mono text-sm transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ANALYZING...
                </>
              ) : (
                'ANALYZE IMPACT'
              )}
            </button>
          </form>

          <div className="mt-4">
            <p className="text-slate-500 text-xs mb-2">Suggested queries:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQueries.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setQuery(suggestion)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300
                             px-2 py-1 rounded border border-slate-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlowingBorder>

      {/* Impact Analysis Results */}
      {impactAnalysis && (
        <GlowingBorder color="red" intensity="medium" animated>
          <div className="bg-slate-900/95 backdrop-blur-sm p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-red-400 font-mono text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                IMPACT DETECTED
              </h3>
              <button
                onClick={clearImpact}
                className="text-slate-400 hover:text-white text-xs"
              >
                Clear
              </button>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-400">Risk Level</span>
                <span className="text-red-400 font-bold">{impactAnalysis.riskLevel}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-amber-500 to-red-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${impactAnalysis.riskLevel}%` }}
                />
              </div>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed mb-3">
              {impactAnalysis.summary}
            </p>

            <div className="space-y-2">
              <div className="text-xs text-slate-400">
                Affected Routes: <span className="text-red-400">{impactAnalysis.affectedRoutes.length}</span>
              </div>
              <div className="text-xs text-slate-400">
                Affected Suppliers: <span className="text-amber-400">{impactAnalysis.affectedSuppliers.length}</span>
              </div>
            </div>
          </div>
        </GlowingBorder>
      )}
    </div>
  );
}
