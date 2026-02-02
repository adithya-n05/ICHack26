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

interface PathEdge {
  id: string;
  status: string;
  fromNodeId?: string;
  toNodeId?: string;
  from_node_id?: string;
  to_node_id?: string;
  materials?: string[];
}

interface DetailPanelProps {
  selectedNode: Company | null;
  selectedConnection: Connection | null;
  onClose: () => void;
  onDeleteConnection?: (id: string) => void;
  alternativeSuppliers?: Company[];
  riskyPathEdge?: PathEdge | null;
  alternativesLoading?: boolean;
  alternativesError?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  healthy: 'bg-accent-green',
  monitoring: 'bg-accent-amber',
  'at-risk': 'bg-accent-orange',
  critical: 'bg-accent-red',
  disrupted: 'bg-red-900',
};

const TRANSPORT_ICONS: Record<string, string> = {
  sea: '⛴︎',
  air: '✈︎',
  land: '⛟',
};

const formatRevenue = (revenue?: number) => {
  if (!revenue) return 'N/A';
  if (revenue >= 1e9) return `$${(revenue / 1e9).toFixed(1)}B`;
  if (revenue >= 1e6) return `$${(revenue / 1e6).toFixed(1)}M`;
  return `$${revenue.toLocaleString()}`;
};

export function DetailPanel({
  selectedNode,
  selectedConnection,
  onClose,
  onDeleteConnection,
  alternativeSuppliers = [],
  riskyPathEdge = null,
  alternativesLoading = false,
  alternativesError = null,
}: DetailPanelProps) {
  // Show connection panel if connection selected
  if (selectedConnection) {
    const isSamsungQualcomm =
      (selectedConnection.from_node_id === 'samsung-hwaseong' &&
        selectedConnection.to_node_id === 'qualcomm-sandiego') ||
      (selectedConnection.fromNode?.name === 'Samsung Semiconductor' &&
        selectedConnection.toNode?.name === 'Qualcomm');
    const samsungQualcommRationale =
      'Risk level increased due to recent seismic activity (9 earthquakes) and elevated AI memory demand.';
    const showAlternatives =
      ['monitoring', 'at-risk', 'critical', 'disrupted'].includes(selectedConnection.status) &&
      alternativeSuppliers.length > 0;
    return (
      <aside
        data-testid="detail-panel"
        className="absolute right-0 top-0 w-[350px] h-full bg-bg-secondary p-4 overflow-y-auto shadow-[-8px_0_24px_rgba(0,0,0,0.35)] ring-1 ring-white/5"
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
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-text-primary text-sm font-bold">
                {selectedConnection.fromNode?.name || selectedConnection.from_node_id}
              </span>
              <span className="text-text-secondary">→</span>
              <span className="text-text-primary text-sm font-bold">
                {selectedConnection.toNode?.name || selectedConnection.to_node_id}
              </span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary text-xs">
              <span>
                {selectedConnection.fromNode
                  ? `${selectedConnection.fromNode.city}, ${selectedConnection.fromNode.country}`
                  : 'Location unavailable'}
              </span>
              <span>→</span>
              <span>
                {selectedConnection.toNode
                  ? `${selectedConnection.toNode.city}, ${selectedConnection.toNode.country}`
                  : 'Location unavailable'}
              </span>
            </div>
          </div>
        </section>

        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Transport Mode
          </h3>
          <span className="inline-flex items-center gap-2 px-2 py-1 bg-bg-tertiary text-text-primary text-sm rounded">
            <span className="text-text-secondary">
              {TRANSPORT_ICONS[selectedConnection.transport_mode] || '⬡'}
            </span>
            <span className="capitalize">{selectedConnection.transport_mode}</span>
          </span>
        </section>

        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Status
          </h3>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${STATUS_COLORS[selectedConnection.status] || 'bg-gray-500'}`}></span>
            <span className="text-text-primary text-sm capitalize">{selectedConnection.status}</span>
          </div>
        </section>

        {selectedConnection.materials && selectedConnection.materials.length > 0 && (
          <section className="mb-4">
            <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
              Materials
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedConnection.materials.map((material, i) => (
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

        {selectedConnection.description && (
          <section className="mb-4">
            <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
              Description
            </h3>
            <p className="text-text-primary text-sm leading-relaxed">
              {selectedConnection.description}
              {isSamsungQualcomm && (
                <>
                  {' '}
                  {samsungQualcommRationale}
                </>
              )}
            </p>
          </section>
        )}

        {selectedConnection.lead_time_days && (
          <section className="mb-4">
            <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
              Lead Time
            </h3>
            <p className="text-text-primary text-sm font-mono">
              {selectedConnection.lead_time_days} days
            </p>
          </section>
        )}

        {selectedConnection.is_user_connection && (
          <div className="mt-4 space-y-2">
            <div className="px-3 py-2 bg-accent-cyan/20 rounded ring-1 ring-accent-cyan/60">
              <span className="text-accent-cyan text-xs font-mono">YOUR SUPPLY CHAIN</span>
            </div>
            {onDeleteConnection && (
              <button
                type="button"
                onClick={() => onDeleteConnection(selectedConnection.id)}
                className="w-full px-3 py-2 rounded text-xs font-mono uppercase tracking-wider text-red-200 ring-1 ring-red-500/60 hover:bg-red-500/10"
              >
                Delete Connection
              </button>
            )}
          </div>
        )}

        {showAlternatives && (
          <section className="mt-6">
            <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
              Alternative Suppliers
            </h3>
            <div className="space-y-2">
              {alternativeSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex items-center justify-between px-2 py-2 bg-bg-tertiary rounded"
                >
                  <div>
                    <p className="text-text-primary text-sm font-bold">{supplier.name}</p>
                    {supplier.country && (
                      <p className="text-text-secondary text-xs">
                        {supplier.city ? `${supplier.city}, ` : ''}
                        {supplier.country}
                      </p>
                    )}
                  </div>
                  <span className="text-accent-green text-xs font-mono">ALT</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </aside>
    );
  }

  // Show node panel if node selected
  if (!selectedNode) return null;
  const showAlternatives =
    alternativesLoading || Boolean(alternativesError) || alternativeSuppliers.length > 0;

  return (
    <aside
      data-testid="detail-panel"
      className="absolute right-0 top-0 w-[350px] h-full bg-bg-secondary p-4 overflow-y-auto shadow-[-8px_0_24px_rgba(0,0,0,0.35)] ring-1 ring-white/5"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-accent-cyan font-mono text-lg font-bold">
          {selectedNode.name}
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
          {selectedNode.city}, {selectedNode.country}
        </p>
        {selectedNode.location && (
          <p className="text-text-secondary text-xs mt-1">
            {selectedNode.location.lat?.toFixed(4)}, {selectedNode.location.lng?.toFixed(4)}
          </p>
        )}
      </section>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Type
        </h3>
        <span className="inline-block px-2 py-1 bg-bg-tertiary text-accent-cyan text-xs font-mono rounded">
          {selectedNode.type.toUpperCase()}
        </span>
      </section>

      {selectedNode.description && (
        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Description
          </h3>
          <p className="text-text-primary text-sm leading-relaxed">
            {selectedNode.description}
          </p>
        </section>
      )}

      {selectedNode.products && selectedNode.products.length > 0 && (
        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Products
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedNode.products.map((product, i) => (
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
              {formatRevenue(selectedNode.annual_revenue_usd)}
            </p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">Employees</p>
            <p className="text-text-primary text-sm font-mono">
              {selectedNode.employees?.toLocaleString() || 'N/A'}
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

      {showAlternatives && (
        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Alternative Suppliers
          </h3>
          {riskyPathEdge && (
            <p className="text-text-secondary text-xs mb-2">
              Trigger: {riskyPathEdge.fromNodeId || riskyPathEdge.from_node_id} →{' '}
              {riskyPathEdge.toNodeId || riskyPathEdge.to_node_id} ({riskyPathEdge.status})
            </p>
          )}
          {alternativesLoading && (
            <p className="text-text-secondary text-xs">Loading alternatives...</p>
          )}
          {alternativesError && (
            <p className="text-accent-orange text-xs">Failed to load alternatives.</p>
          )}
          {alternativeSuppliers.length > 0 && (
            <div className="space-y-2">
              {alternativeSuppliers.slice(0, 5).map((supplier) => (
                <div
                  key={supplier.id}
                  className="px-2 py-2 bg-bg-tertiary rounded ring-1 ring-white/5"
                >
                  <div className="text-text-primary text-sm font-mono">{supplier.name}</div>
                  <div className="text-text-secondary text-xs">
                    {supplier.city}, {supplier.country}
                  </div>
                  {supplier.products && supplier.products.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {supplier.products.slice(0, 3).map((product, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-bg-primary text-text-secondary text-[10px] rounded"
                        >
                          {product}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </aside>
  );
}
