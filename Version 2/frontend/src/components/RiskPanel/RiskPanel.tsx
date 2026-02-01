// frontend/src/components/RiskPanel/RiskPanel.tsx
// Panel displaying supply chain risk assessment and alerts

import { useSupplyChainHealth, useHighRiskEntities } from '../../hooks/useRisk';
import { useAlerts } from '../../hooks/useAlerts';

interface RiskPanelProps {
  onEntitySelect?: (entityId: string, entityType: string) => void;
}

export function RiskPanel({ onEntitySelect }: RiskPanelProps) {
  const { health, loading: healthLoading } = useSupplyChainHealth();
  const { entities: highRiskEntities, loading: entitiesLoading } = useHighRiskEntities(40);
  const { alerts, unreadCount, markAllRead, dismissAlert } = useAlerts();

  const getHealthColor = (level: string) => {
    switch (level) {
      case 'healthy': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'degraded': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-l-red-500 bg-red-500/10';
      case 'warning': return 'border-l-yellow-500 bg-yellow-500/10';
      default: return 'border-l-blue-500 bg-blue-500/10';
    }
  };

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden w-80 max-h-[600px] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/50">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <span className="text-lg">⚡</span>
          Risk Assessment
        </h2>
      </div>

      {/* Health Overview */}
      <div className="px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">Supply Chain Health</span>
          {healthLoading ? (
            <span className="text-gray-500 text-sm">Loading...</span>
          ) : health ? (
            <span className={`font-bold ${getHealthColor(health.healthLevel)}`}>
              {health.overallScore}/100
            </span>
          ) : (
            <span className="text-gray-500 text-sm">N/A</span>
          )}
        </div>
        
        {health && (
          <>
            {/* Health Bar */}
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  health.healthLevel === 'critical' ? 'bg-red-500' :
                  health.healthLevel === 'degraded' ? 'bg-orange-500' :
                  health.healthLevel === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${health.overallScore}%` }}
              />
            </div>
            
            {/* Quick Stats */}
            <div className="flex gap-4 text-xs">
              <div className="text-gray-400">
                <span className="text-red-400 font-semibold">{health.criticalCount}</span> Critical
              </div>
              <div className="text-gray-400">
                <span className="text-orange-400 font-semibold">{health.highRiskCount}</span> High Risk
              </div>
              <div className="text-gray-400">
                <span className="text-blue-400 font-semibold">{health.activeEvents}</span> Events
              </div>
            </div>
          </>
        )}
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm flex items-center gap-2">
              🔔 Alerts
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </span>
            <button
              onClick={markAllRead}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Mark all read
            </button>
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`border-l-2 pl-2 py-1 text-xs ${getAlertSeverityColor(alert.severity)}`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-white font-medium">{alert.title}</span>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-gray-500 hover:text-gray-300 ml-2"
                  >
                    ×
                  </button>
                </div>
                <p className="text-gray-400 truncate">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* High Risk Entities */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <span className="text-gray-400 text-sm block mb-2">High Risk Entities</span>
        
        {entitiesLoading ? (
          <div className="text-gray-500 text-sm">Loading...</div>
        ) : highRiskEntities.length === 0 ? (
          <div className="text-gray-500 text-sm">No high-risk entities detected</div>
        ) : (
          <div className="space-y-2">
            {highRiskEntities.slice(0, 10).map((entity) => (
              <button
                key={entity.entityId}
                onClick={() => onEntitySelect?.(entity.entityId, entity.entityType)}
                className="w-full text-left p-2 rounded border border-gray-700 hover:border-gray-600 bg-gray-800/50 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-sm font-medium truncate pr-2">
                    {entity.entityName}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded border ${getRiskLevelColor(entity.riskLevel)}`}>
                    {entity.riskScore}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="capitalize">{entity.entityType}</span>
                  <span>•</span>
                  <span className={
                    entity.trend === 'worsening' ? 'text-red-400' :
                    entity.trend === 'improving' ? 'text-green-400' : ''
                  }>
                    {entity.trend === 'worsening' ? '↗ Worsening' :
                     entity.trend === 'improving' ? '↘ Improving' : '→ Stable'}
                  </span>
                </div>
                {entity.factors.length > 0 && (
                  <div className="mt-1 text-xs text-gray-500 truncate">
                    {entity.factors[0].description}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RiskPanel;
