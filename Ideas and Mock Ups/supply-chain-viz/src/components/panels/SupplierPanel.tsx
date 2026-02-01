import { GlowingBorder } from '@/components/ui/GlowingBorder';
import { alternativeSuppliers } from '@/data/mockSupplyChain';
import { useAppStore } from '@/store';

const riskColors = {
  low: 'text-green-400 bg-green-400/10 border-green-400/30',
  medium: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  high: 'text-red-400 bg-red-400/10 border-red-400/30',
};

function getRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score < 40) return 'low';
  if (score < 70) return 'medium';
  return 'high';
}

export function SupplierPanel() {
  const { impactAnalysis } = useAppStore();

  // Show different suppliers based on impact
  const relevantSuppliers = impactAnalysis
    ? alternativeSuppliers.filter(s => s.riskScore < 50)
    : alternativeSuppliers.slice(0, 3);

  return (
    <GlowingBorder color="amber" intensity="low">
      <div className="bg-slate-900/95 backdrop-blur-sm p-4 rounded-lg">
        <h3 className="text-amber-400 font-mono text-sm mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-400 rounded-full" />
          {impactAnalysis ? 'RECOMMENDED ALTERNATIVES' : 'SUPPLIER NETWORK'}
        </h3>

        {impactAnalysis && (
          <div className="bg-slate-800/50 p-3 rounded border-l-2 border-amber-500 mb-4">
            <p className="text-slate-300 text-xs leading-relaxed">
              Based on current risk analysis, we recommend diversifying to suppliers with lower geopolitical exposure. The following alternatives offer reduced risk profiles:
            </p>
          </div>
        )}

        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
          {relevantSuppliers.map((supplier) => {
            const riskLevel = getRiskLevel(supplier.riskScore);
            return (
              <div
                key={supplier.id}
                className="bg-slate-800 p-3 rounded border border-slate-700
                           hover:border-amber-500/50 transition-colors cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-white font-medium text-sm group-hover:text-amber-400 transition-colors">
                    {supplier.name}
                  </h4>
                  <span className={`text-xs px-2 py-0.5 rounded border ${riskColors[riskLevel]}`}>
                    {riskLevel.toUpperCase()}
                  </span>
                </div>

                <p className="text-slate-400 text-xs mb-2">
                  {supplier.country} • {supplier.products.slice(0, 2).join(', ')}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Lead Time</span>
                    <p className="text-white">{supplier.leadTimeDays} days</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Capacity</span>
                    <p className="text-white">{supplier.capacityUtilization}%</p>
                  </div>
                </div>

                {impactAnalysis && riskLevel === 'low' && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <span className="text-green-400 text-xs flex items-center gap-1">
                      ✓ Recommended alternative
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </GlowingBorder>
  );
}
