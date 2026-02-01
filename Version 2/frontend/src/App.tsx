import { useState, useEffect, useMemo } from 'react';
import { Map } from './components/Map';
import { DetailPanel } from './components/DetailPanel';
import { NewsSidebar } from './components/NewsSidebar/NewsSidebar';
import { TariffPanel, type TariffHeatmapSummary } from './components/TariffPanel/TariffPanel';
import { SupplierForm } from './components/SupplierForm';
import { socket } from './lib/socket';
import { usePaths } from './hooks/usePaths';
import { createUserConnection, deleteUserConnection, fetchUserConnections } from './lib/userConnections';

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

interface MapCompany extends Omit<Company, 'location'> {
  location?: { lat: number; lng: number };
  lat?: number | null;
  lng?: number | null;
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
  fromNodeId?: string;
  toNodeId?: string;
  from_node_id?: string;
  to_node_id?: string;
  transportMode?: string;
  transport_mode?: string;
  status: string;
  isUserConnection?: boolean;
  is_user_connection?: boolean;
  materials?: string[];
  description?: string;
  leadTimeDays?: number;
  lead_time_days?: number;
}

type MapConnection = Omit<Connection, 'fromNode' | 'toNode'> & {
  fromNode?: MapCompany;
  toNode?: MapCompany;
};

interface NewsItem {
  id: string;
  title: string;
  source: string;
  url?: string;
  publishedAt?: string;
  category?: string;
}

function App() {
  const [selectedNode, setSelectedNode] = useState<Company | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const [userConnections, setUserConnections] = useState<Connection[]>([]);
  const [connectMode, setConnectMode] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<Company | null>(null);
  const [tariffHeatmap, setTariffHeatmap] = useState<TariffHeatmapSummary | null>(null);
  const { edges: pathEdges, loading: pathsLoading, error: pathsError } = usePaths(selectedNode?.id);
  const [alternativeSuppliers, setAlternativeSuppliers] = useState<Company[]>([]);
  const [alternativesLoading, setAlternativesLoading] = useState(false);
  const [alternativesError, setAlternativesError] = useState<string | null>(null);
  const firstAmberEdge = useMemo(() => {
    if (!selectedNode || pathEdges.length === 0) return null;
    const amberStatuses = new Set(['monitoring', 'at-risk', 'critical', 'disrupted']);
    return pathEdges.find((edge) => amberStatuses.has(edge.status)) ?? null;
  }, [pathEdges, selectedNode]);
  const alternativeMaterial = firstAmberEdge?.materials?.[0];
  const shouldFetchAlternatives = Boolean(selectedNode && firstAmberEdge && alternativeMaterial);

  useEffect(() => {
    let isMounted = true;

    const loadUserConnections = async () => {
      try {
        const data = await fetchUserConnections();
        if (!isMounted) return;
        setUserConnections(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Failed to load user connections:', err);
      }
    };

    loadUserConnections();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch initial news
  useEffect(() => {
    fetch(`${API_URL}/api/news`)
      .then(res => res.json())
      .then(data => {
        console.log('Loaded news:', data.length);
        setNews(data);
      })
      .catch(err => console.error('Failed to load news:', err));
  }, []);

  // Listen for real-time news updates
  useEffect(() => {
    const handleNewNews = (items: NewsItem | NewsItem[]) => {
      // Handle undefined/null
      if (!items) return;

      // Normalize to array
      const newsArray = Array.isArray(items) ? items : [items];

      // Filter out invalid items
      const validNews = newsArray.filter(item => item && item.id && item.title);

      if (validNews.length > 0) {
        console.log('Received new news:', validNews.length);
        setNews(prev => [...validNews, ...prev].slice(0, 50));
      }
    };

    socket.on('new-news', handleNewNews);

    return () => {
      socket.off('new-news', handleNewNews);
    };
  }, []);

  useEffect(() => {
    if (pathsError) {
      console.error('Failed to load paths:', pathsError);
    }
  }, [pathsError]);

  useEffect(() => {
    if (pathsLoading) {
      console.log('Loading inferred paths...');
    }
  }, [pathsLoading]);

  useEffect(() => {
    let isMounted = true;

    if (!shouldFetchAlternatives || !alternativeMaterial) {
      return () => {
        isMounted = false;
      };
    }

    const fetchAlternatives = async () => {
      if (isMounted) {
        setAlternativesLoading(true);
        setAlternativesError(null);
      }

      try {
        const res = await fetch(
          `${API_URL}/api/alternatives?material=${encodeURIComponent(alternativeMaterial)}`
        );
        if (!res.ok) {
          throw new Error(`Failed to load alternatives (${res.status})`);
        }
        const data = await res.json();
        if (!isMounted) return;
        setAlternativeSuppliers(Array.isArray(data) ? data : []);
        setAlternativesLoading(false);
      } catch (err) {
        if (!isMounted) return;
        setAlternativeSuppliers([]);
        setAlternativesError((err as Error).message);
        setAlternativesLoading(false);
      }
    };

    fetchAlternatives();

    return () => {
      isMounted = false;
    };
  }, [alternativeMaterial, shouldFetchAlternatives]);

  const effectiveAlternativeSuppliers = shouldFetchAlternatives ? alternativeSuppliers : [];
  const effectiveAlternativesLoading = shouldFetchAlternatives ? alternativesLoading : false;
  const effectiveAlternativesError = shouldFetchAlternatives ? alternativesError : null;
  const effectiveRiskyPathEdge = shouldFetchAlternatives ? firstAmberEdge : null;

  const normalizeCompany = (node: MapCompany): Company | null => {
    if (node.location) {
      return { ...node, location: node.location };
    }
    if (typeof node.lat === 'number' && typeof node.lng === 'number') {
      return { ...node, location: { lat: node.lat, lng: node.lng } };
    }
    return null;
  };

  const isDuplicateUserConnection = (fromId: string, toId: string) =>
    userConnections.some(
      (connection) =>
        (connection.from_node_id === fromId && connection.to_node_id === toId) ||
        (connection.from_node_id === toId && connection.to_node_id === fromId),
    );

  const handleNodeClick = async (node: MapCompany) => {
    const normalizedNode = normalizeCompany(node);
    if (!normalizedNode) {
      console.warn('Skipping node without location:', node.id);
      return;
    }
    console.log('Node clicked:', node.name);
    setTariffHeatmap(null);

    if (connectMode) {
      setSelectedNode(null);
      setSelectedConnection(null);

      if (!pendingConnection) {
        setPendingConnection(normalizedNode);
        return;
      }

      if (pendingConnection.id === normalizedNode.id) {
        setPendingConnection(null);
        return;
      }

      if (isDuplicateUserConnection(pendingConnection.id, normalizedNode.id)) {
        setPendingConnection(null);
        return;
      }

      try {
        const savedConnection = await createUserConnection({
          from_node_id: pendingConnection.id,
          to_node_id: normalizedNode.id,
          transport_mode: 'land',
          status: 'healthy',
        });
        setUserConnections((prev) => [...prev, savedConnection]);
        setSelectedConnection({
          ...savedConnection,
          fromNode: pendingConnection,
          toNode: normalizedNode,
        });
      } catch (err) {
        console.warn('Failed to save user connection:', err);
      }
      setPendingConnection(null);
      return;
    }

    setSelectedConnection(null);
    setSelectedNode(normalizedNode);
  };

  const handleConnectionClick = (connection: MapConnection) => {
    const fromNode = connection.fromNode ? normalizeCompany(connection.fromNode) ?? undefined : undefined;
    const toNode = connection.toNode ? normalizeCompany(connection.toNode) ?? undefined : undefined;
    console.log('Connection clicked:', connection.id);
    setTariffHeatmap(null);
    setSelectedNode(null);
    setSelectedConnection({
      ...connection,
      fromNode,
      toNode,
    });
  };

  const handleDeleteConnection = async (id: string) => {
    try {
      await deleteUserConnection(id);
      setUserConnections((prev) => prev.filter((conn) => conn.id !== id));
      setSelectedConnection(null);
    } catch (err) {
      console.warn('Failed to delete user connection:', err);
    }
  };

  const handleClosePanel = () => {
    setSelectedNode(null);
    setSelectedConnection(null);
    setTariffHeatmap(null);
  };

  const handleTariffHeatmapClick = (summary: TariffHeatmapSummary) => {
    setSelectedNode(null);
    setSelectedConnection(null);
    setTariffHeatmap(summary);
  };

  const toggleConnectMode = () => {
    setConnectMode((prev) => !prev);
    setPendingConnection(null);
    setSelectedNode(null);
    setSelectedConnection(null);
    setTariffHeatmap(null);
  };

  const handleSupplierFormSuccess = () => {
    setShowSupplierForm(false);
    // Trigger map refresh by incrementing key
    setMapRefreshKey(k => k + 1);
  };

  return (
    <div className="h-screen w-screen bg-bg-primary flex flex-col">
      {/* Header with Add Supply Chain button */}
      <header className="h-14 bg-bg-secondary flex items-center justify-between px-4 shadow-[0_1px_12px_rgba(0,0,0,0.35)] ring-1 ring-white/5">
        <h1 className="text-accent-cyan font-mono text-lg font-bold">SENTINEL ZERO</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleConnectMode}
            className={`px-3 py-1 rounded font-mono text-sm transition ring-1 ${
              connectMode
                ? 'bg-accent-cyan/20 text-accent-cyan ring-accent-cyan/60'
                : 'bg-bg-tertiary text-text-primary ring-white/10 hover:ring-accent-cyan/50'
            }`}
          >
            {connectMode ? 'Connect Mode: On' : 'Connect Nodes'}
          </button>
          <button
            onClick={() => setShowSupplierForm(true)}
            className="px-3 py-1 bg-accent-cyan text-bg-primary rounded font-mono text-sm hover:opacity-90"
          >
            + Add Supply Chain
          </button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 relative">
        <Map
          key={mapRefreshKey}
          onNodeClick={handleNodeClick}
          onConnectionClick={handleConnectionClick}
          onTariffHeatmapClick={handleTariffHeatmapClick}
          pathEdges={pathEdges as PathEdge[]}
          alternativeSuppliers={effectiveAlternativeSuppliers}
          userConnections={userConnections}
        />
        <NewsSidebar items={news} />
        {connectMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-bg-secondary/95 px-4 py-3 rounded shadow-lg ring-1 ring-white/5">
            <div className="text-accent-cyan text-[11px] font-mono uppercase tracking-wider">
              Connect Mode
            </div>
            <div className="text-text-primary text-sm mt-1">
              {pendingConnection
                ? `Select destination for ${pendingConnection.name}`
                : 'Select the first node to start a connection.'}
            </div>
            {pendingConnection && (
              <div className="text-text-secondary text-xs mt-1">
                From: {pendingConnection.name}
              </div>
            )}
          </div>
        )}
        {tariffHeatmap ? (
          <TariffPanel summary={tariffHeatmap} onClose={handleClosePanel} />
        ) : (
          <DetailPanel
            selectedNode={selectedNode}
            selectedConnection={selectedConnection}
            onClose={handleClosePanel}
            onDeleteConnection={handleDeleteConnection}
            alternativeSuppliers={effectiveAlternativeSuppliers}
            riskyPathEdge={effectiveRiskyPathEdge}
            alternativesLoading={effectiveAlternativesLoading}
            alternativesError={effectiveAlternativesError}
          />
        )}
      </div>

      {/* Supplier form modal */}
      {showSupplierForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <SupplierForm
            onSubmitSuccess={handleSupplierFormSuccess}
            onClose={() => setShowSupplierForm(false)}
          />
        </div>
      )}
    </div>
  );
}

export default App;
