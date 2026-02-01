import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Company {
  id: string;
  name: string;
  type: string;
  location: { lat: number; lng: number };
  city: string;
  country: string;
  description?: string;
  products?: string[];
  annual_revenue_usd?: number;
  employees?: number;
}

interface Connection {
  id: string;
  from_node_id: string;
  to_node_id: string;
  transport_mode: string;
  status: string;
  is_user_connection: boolean;
  materials?: string[];
  description?: string;
  lead_time_days?: number;
  fromNode?: Company;
  toNode?: Company;
}

interface GeoEvent {
  id: string;
  type: string;
  title: string;
  location?: { lat: number; lng: number };
  lat?: number | null;
  lng?: number | null;
  severity: number;
  polygon?: Array<{ lat: number; lng: number }>;
  source?: string;
  description?: string;
  affected_countries?: string[];
  affected_regions?: string[];
  startDate?: string;
  start_date?: string;
}

interface ConnectionRiskDetails {
  connectionId: string;
  status: string;
  riskScore: number;
  explanation: string;
  factors: Array<{
    name: string;
    contribution: number;
    description: string;
  }>;
  relatedEvents: Array<{
    id: string;
    title: string;
    type: string;
    severity: number;
    distance: number;
    timestamp: string;
  }>;
  lastUpdated: string;
}

interface MitigationAction {
  id: string;
  type: 'immediate' | 'short-term' | 'long-term';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedImpact: number;
  estimatedCost?: string;
  timeToImplement?: string;
}

interface MitigationPlan {
  entityId: string;
  entityName: string;
  entityType: string;
  actions: MitigationAction[];
  alternativeSuppliers: Array<{
    id: string;
    name: string;
    country: string;
    riskScore: number;
    similarity: number;
  }>;
  alternativeRoutes: Array<{
    path: string[];
    totalDistance: number;
    estimatedTime: number;
    riskScore: number;
  }>;
  estimatedRiskReduction: number;
  generatedAt: string;
}

interface DetailPanelProps {
  selectedNode: Company | null;
  selectedConnection: Connection | null;
  selectedEvent: GeoEvent | null;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  healthy: 'bg-accent-green',
  monitoring: 'bg-accent-amber',
  'at-risk': 'bg-accent-orange',
  critical: 'bg-accent-red',
  disrupted: 'bg-red-900',
};

const EVENT_TYPE_ICONS: Record<string, string> = {
  war: '⚔️',
  natural_disaster: '🌋',
  weather: '🌪️',
  geopolitical: '🏛️',
  tariff: '💰',
  infrastructure: '🏗️',
};

const TRANSPORT_ICONS: Record<string, string> = {
  sea: '🚢',
  air: '✈️',
  land: '🚛',
};

const formatRevenue = (revenue?: number) => {
  if (!revenue) return 'N/A';
  if (revenue >= 1e9) return `$${(revenue / 1e9).toFixed(1)}B`;
  if (revenue >= 1e6) return `$${(revenue / 1e6).toFixed(1)}M`;
  return `$${revenue.toLocaleString()}`;
};

const getSeverityLabel = (severity: number) => {
  if (severity >= 7) return { label: 'High', color: 'bg-accent-red' };
  if (severity >= 4) return { label: 'Medium', color: 'bg-accent-orange' };
  return { label: 'Low', color: 'bg-accent-amber' };
};

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Connection Panel Component with risk fetching
function ConnectionPanel({ 
  connection, 
  onClose 
}: { 
  connection: Connection; 
  onClose: () => void;
}) {
  const [riskDetails, setRiskDetails] = useState<ConnectionRiskDetails | null>(null);
  const [mitigation, setMitigation] = useState<MitigationPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [mitigationLoading, setMitigationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMitigation, setShowMitigation] = useState(false);

  useEffect(() => {
    async function fetchRisk() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/api/connections/${connection.id}/risk`);
        if (response.ok) {
          const data = await response.json();
          setRiskDetails(data);
        } else {
          setError('Could not load risk details');
        }
      } catch (err) {
        console.error('Error fetching connection risk:', err);
        setError('Failed to load risk details');
      } finally {
        setLoading(false);
      }
    }

    fetchRisk();
  }, [connection.id]);

  const fetchMitigation = async () => {
    setMitigationLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/connections/${connection.id}/mitigation`);
      if (response.ok) {
        const data = await response.json();
        setMitigation(data);
        setShowMitigation(true);
      }
    } catch (err) {
      console.error('Error fetching mitigation:', err);
    } finally {
      setMitigationLoading(false);
    }
  };

  return (
    <aside
      data-testid="detail-panel"
      className="absolute right-0 top-0 w-[350px] h-full bg-bg-secondary border-l border-border-color p-4 overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-accent-cyan font-mono text-lg font-bold">
          Supply Route
        </h2>
        <button
          data-testid="detail-panel-close"
          onClick={onClose}
          className="text-text-secondary hover:text-text-primary text-xl"
        >
          ×
        </button>
      </div>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Route
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-text-primary text-sm font-bold">
            {connection.fromNode?.name || connection.from_node_id}
          </span>
          <span className="text-text-secondary">→</span>
          <span className="text-text-primary text-sm font-bold">
            {connection.toNode?.name || connection.to_node_id}
          </span>
        </div>
      </section>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Transport Mode
        </h3>
        <span className="inline-flex items-center gap-2 px-2 py-1 bg-bg-tertiary text-text-primary text-sm rounded">
          <span>{TRANSPORT_ICONS[connection.transport_mode] || '📦'}</span>
          <span className="capitalize">{connection.transport_mode}</span>
        </span>
      </section>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Status
        </h3>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${STATUS_COLORS[riskDetails?.status || connection.status] || 'bg-gray-500'}`}></span>
          <span className="text-text-primary text-sm capitalize">{riskDetails?.status || connection.status}</span>
          {riskDetails && (
            <span className="text-text-secondary text-xs">({riskDetails.riskScore}/100)</span>
          )}
        </div>
      </section>

      {/* Risk Explanation Section */}
      {loading ? (
        <section className="mb-4">
          <div className="animate-pulse">
            <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-bg-tertiary rounded w-full mb-2"></div>
            <div className="h-4 bg-bg-tertiary rounded w-5/6"></div>
          </div>
        </section>
      ) : error ? (
        <section className="mb-4 p-3 bg-accent-red/10 border border-accent-red/30 rounded">
          <p className="text-text-secondary text-sm">{error}</p>
        </section>
      ) : riskDetails?.explanation ? (
        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Risk Analysis
          </h3>
          <p className="text-text-primary text-sm leading-relaxed bg-bg-tertiary p-3 rounded">
            {riskDetails.explanation}
          </p>
        </section>
      ) : null}

      {/* Risk Factors */}
      {riskDetails?.factors && riskDetails.factors.length > 0 && (
        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Risk Factors
          </h3>
          <div className="space-y-2">
            {riskDetails.factors.map((factor, i) => (
              <div key={i} className="bg-bg-tertiary p-2 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-text-primary text-xs font-medium">{factor.name}</span>
                  <span className={`text-xs font-mono ${
                    factor.contribution >= 30 ? 'text-accent-red' :
                    factor.contribution >= 15 ? 'text-accent-orange' : 'text-accent-amber'
                  }`}>
                    +{factor.contribution}%
                  </span>
                </div>
                <div className="w-full bg-bg-primary rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${
                      factor.contribution >= 30 ? 'bg-accent-red' :
                      factor.contribution >= 15 ? 'bg-accent-orange' : 'bg-accent-amber'
                    }`}
                    style={{ width: `${Math.min(100, factor.contribution)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Related Events */}
      {riskDetails?.relatedEvents && riskDetails.relatedEvents.length > 0 && (
        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Related Events ({riskDetails.relatedEvents.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {riskDetails.relatedEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="bg-bg-tertiary p-2 rounded text-xs">
                <div className="flex items-start gap-2">
                  <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                    event.severity >= 7 ? 'bg-accent-red' :
                    event.severity >= 4 ? 'bg-accent-orange' : 'bg-accent-amber'
                  }`}></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary line-clamp-2">{event.title}</p>
                    <div className="flex gap-2 mt-1 text-text-secondary">
                      <span>{event.distance}km away</span>
                      <span>•</span>
                      <span>{formatTimestamp(event.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {connection.materials && connection.materials.length > 0 && (
        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Materials
          </h3>
          <div className="flex flex-wrap gap-2">
            {connection.materials.map((material, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-bg-tertiary text-text-primary text-xs rounded"
              >
                {material}
              </span>
            ))}
          </div>
        </section>
      )}

      {connection.lead_time_days && (
        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Lead Time
          </h3>
          <p className="text-text-primary text-sm font-mono">
            {connection.lead_time_days} days
          </p>
        </section>
      )}

      {connection.is_user_connection && (
        <div className="mt-4 px-3 py-2 bg-accent-cyan/20 border border-accent-cyan rounded">
          <span className="text-accent-cyan text-xs font-mono">YOUR SUPPLY CHAIN</span>
        </div>
      )}

      {/* Mitigation Section - Shows for high-risk routes */}
      {riskDetails && riskDetails.riskScore >= 40 && (
        <section className="mt-4 pt-4 border-t border-border-color">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-accent-orange text-xs font-mono uppercase tracking-wider flex items-center gap-2">
              <span>⚠️</span> Mitigation Options
            </h3>
            {!showMitigation && (
              <button
                onClick={fetchMitigation}
                disabled={mitigationLoading}
                className="px-3 py-1 bg-accent-orange/20 text-accent-orange text-xs rounded hover:bg-accent-orange/30 transition-colors disabled:opacity-50"
              >
                {mitigationLoading ? 'Loading...' : 'Get Plan'}
              </button>
            )}
          </div>

          {showMitigation && mitigation && (
            <div className="space-y-3">
              {/* Risk Reduction Estimate */}
              <div className="bg-accent-green/10 border border-accent-green/30 rounded p-2">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary text-xs">Estimated Risk Reduction</span>
                  <span className="text-accent-green font-mono text-sm font-bold">
                    -{mitigation.estimatedRiskReduction}%
                  </span>
                </div>
              </div>

              {/* Recommended Actions */}
              {mitigation.actions.length > 0 && (
                <div>
                  <h4 className="text-text-secondary text-xs mb-2">Recommended Actions</h4>
                  <div className="space-y-2">
                    {mitigation.actions.slice(0, 4).map((action) => (
                      <div
                        key={action.id}
                        className={`p-2 rounded text-xs ${
                          action.priority === 'critical' ? 'bg-accent-red/10 border border-accent-red/30' :
                          action.priority === 'high' ? 'bg-accent-orange/10 border border-accent-orange/30' :
                          'bg-bg-tertiary'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${
                            action.type === 'immediate' ? 'bg-accent-red/20 text-accent-red' :
                            action.type === 'short-term' ? 'bg-accent-orange/20 text-accent-orange' :
                            'bg-accent-amber/20 text-accent-amber'
                          }`}>
                            {action.type}
                          </span>
                          <div className="flex-1">
                            <p className="text-text-primary font-medium">{action.title}</p>
                            <p className="text-text-secondary mt-1">{action.description}</p>
                            {action.estimatedImpact > 0 && (
                              <p className="text-accent-green mt-1">
                                Impact: -{action.estimatedImpact}% risk
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternative Suppliers */}
              {mitigation.alternativeSuppliers.length > 0 && (
                <div>
                  <h4 className="text-text-secondary text-xs mb-2">Alternative Suppliers</h4>
                  <div className="space-y-1">
                    {mitigation.alternativeSuppliers.slice(0, 3).map((supplier) => (
                      <div
                        key={supplier.id}
                        className="flex justify-between items-center p-2 bg-bg-tertiary rounded text-xs"
                      >
                        <div>
                          <span className="text-text-primary">{supplier.name}</span>
                          <span className="text-text-secondary ml-2">({supplier.country})</span>
                        </div>
                        <div className="flex gap-2">
                          <span className={`font-mono ${
                            supplier.riskScore <= 30 ? 'text-accent-green' :
                            supplier.riskScore <= 60 ? 'text-accent-amber' : 'text-accent-red'
                          }`}>
                            {supplier.riskScore}/100
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternative Routes */}
              {mitigation.alternativeRoutes.length > 0 && (
                <div>
                  <h4 className="text-text-secondary text-xs mb-2">Alternative Routes</h4>
                  <div className="space-y-1">
                    {mitigation.alternativeRoutes.slice(0, 2).map((route, i) => (
                      <div
                        key={i}
                        className="p-2 bg-bg-tertiary rounded text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-text-primary">
                            {route.path.join(' → ')}
                          </span>
                          <span className={`font-mono ${
                            route.riskScore <= 30 ? 'text-accent-green' :
                            route.riskScore <= 60 ? 'text-accent-amber' : 'text-accent-red'
                          }`}>
                            {Math.round(route.riskScore)}/100
                          </span>
                        </div>
                        <div className="text-text-secondary mt-1">
                          {route.totalDistance}km • ~{route.estimatedTime}h
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-text-secondary text-[10px] mt-2">
                Generated: {formatTimestamp(mitigation.generatedAt)}
              </p>
            </div>
          )}
        </section>
      )}

      {riskDetails?.lastUpdated && (
        <div className="mt-4 text-text-secondary text-xs">
          Last updated: {formatTimestamp(riskDetails.lastUpdated)}
        </div>
      )}
    </aside>
  );
}

// Event Panel Component
function EventPanel({ 
  event, 
  onClose 
}: { 
  event: GeoEvent; 
  onClose: () => void;
}) {
  const severityInfo = getSeverityLabel(event.severity);
  const eventLocation = event.location || 
    (event.lat && event.lng ? { lat: event.lat, lng: event.lng } : null);
  const timestamp = event.startDate || event.start_date;

  return (
    <aside
      data-testid="detail-panel"
      className="absolute right-0 top-0 w-[350px] h-full bg-bg-secondary border-l border-border-color p-4 overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-accent-cyan font-mono text-lg font-bold">
          Risk Event
        </h2>
        <button
          data-testid="detail-panel-close"
          onClick={onClose}
          className="text-text-secondary hover:text-text-primary text-xl"
        >
          ×
        </button>
      </div>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Event Title
        </h3>
        <p className="text-text-primary text-sm leading-relaxed">
          {event.title}
        </p>
      </section>

      {/* Timestamp Section */}
      {timestamp && (
        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            When
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-text-primary text-sm">
              {new Date(timestamp).toLocaleString()}
            </span>
            <span className="text-text-secondary text-xs">
              ({formatTimestamp(timestamp)})
            </span>
          </div>
        </section>
      )}

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Type
        </h3>
        <span className="inline-flex items-center gap-2 px-2 py-1 bg-bg-tertiary text-text-primary text-sm rounded">
          <span>{EVENT_TYPE_ICONS[event.type] || '⚠️'}</span>
          <span className="capitalize">{event.type.replace('_', ' ')}</span>
        </span>
      </section>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Severity
        </h3>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${severityInfo.color}`}></span>
          <span className="text-text-primary text-sm">{severityInfo.label}</span>
          <span className="text-text-secondary text-sm">({event.severity}/10)</span>
        </div>
      </section>

      {event.source && (
        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Source
          </h3>
          <span className="inline-block px-2 py-1 bg-bg-tertiary text-accent-cyan text-xs font-mono rounded">
            {event.source}
          </span>
        </section>
      )}

      {eventLocation && (
        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Location
          </h3>
          <p className="text-text-secondary text-xs">
            {eventLocation.lat?.toFixed(4)}, {eventLocation.lng?.toFixed(4)}
          </p>
        </section>
      )}

      {event.affected_countries && event.affected_countries.length > 0 && (
        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Affected Countries
          </h3>
          <div className="flex flex-wrap gap-2">
            {event.affected_countries.map((country, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-bg-tertiary text-text-primary text-xs rounded"
              >
                {country}
              </span>
            ))}
          </div>
        </section>
      )}

      {event.description && (
        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Description
          </h3>
          <p className="text-text-primary text-sm leading-relaxed">
            {event.description}
          </p>
        </section>
      )}

      <div className="mt-4 px-3 py-2 bg-accent-orange/20 border border-accent-orange rounded">
        <span className="text-accent-orange text-xs font-mono">ACTIVE RISK EVENT</span>
      </div>
    </aside>
  );
}

// Node Panel Component
function NodePanel({ 
  node, 
  onClose 
}: { 
  node: Company; 
  onClose: () => void;
}) {
  return (
    <aside
      data-testid="detail-panel"
      className="absolute right-0 top-0 w-[350px] h-full bg-bg-secondary border-l border-border-color p-4 overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-accent-cyan font-mono text-lg font-bold">
          {node.name}
        </h2>
        <button
          data-testid="detail-panel-close"
          onClick={onClose}
          className="text-text-secondary hover:text-text-primary text-xl"
        >
          ×
        </button>
      </div>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Location
        </h3>
        <p className="text-text-primary text-sm">
          {node.city}, {node.country}
        </p>
        {node.location && (
          <p className="text-text-secondary text-xs mt-1">
            {node.location.lat?.toFixed(4)}, {node.location.lng?.toFixed(4)}
          </p>
        )}
      </section>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Type
        </h3>
        <span className="inline-block px-2 py-1 bg-bg-tertiary text-accent-cyan text-xs font-mono rounded">
          {node.type.toUpperCase()}
        </span>
      </section>

      {node.description && (
        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Description
          </h3>
          <p className="text-text-primary text-sm leading-relaxed">
            {node.description}
          </p>
        </section>
      )}

      {node.products && node.products.length > 0 && (
        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Products
          </h3>
          <div className="flex flex-wrap gap-2">
            {node.products.map((product, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-bg-tertiary text-text-primary text-xs rounded"
              >
                {product}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Financials
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-text-secondary text-xs">Annual Revenue</p>
            <p className="text-text-primary text-sm font-mono">
              {formatRevenue(node.annual_revenue_usd)}
            </p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">Employees</p>
            <p className="text-text-primary text-sm font-mono">
              {node.employees?.toLocaleString() || 'N/A'}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Risk Status
        </h3>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-accent-green"></span>
          <span className="text-text-primary text-sm">Healthy</span>
        </div>
      </section>
    </aside>
  );
}

// Main DetailPanel Component
export function DetailPanel({ selectedNode, selectedConnection, selectedEvent, onClose }: DetailPanelProps) {
  // Show event panel if event selected
  if (selectedEvent) {
    return <EventPanel event={selectedEvent} onClose={onClose} />;
  }

  // Show connection panel if connection selected
  if (selectedConnection) {
    return <ConnectionPanel connection={selectedConnection} onClose={onClose} />;
  }

  // Show node panel if node selected
  if (selectedNode) {
    return <NodePanel node={selectedNode} onClose={onClose} />;
  }

  return null;
}
