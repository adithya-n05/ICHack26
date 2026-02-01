import { useState, useEffect, useMemo } from 'react';
import { Map } from './components/Map';
import { DetailPanel } from './components/DetailPanel';
import { NewsTicker } from './components/NewsTicker';
import { SupplierForm } from './components/SupplierForm';
import { socket } from './lib/socket';
import { usePaths } from './hooks/usePaths';

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

  const handleNodeClick = (node: MapCompany) => {
    const normalizedNode = normalizeCompany(node);
    if (!normalizedNode) {
      console.warn('Skipping node without location:', node.id);
      return;
    }
    console.log('Node clicked:', node.name);
    setSelectedConnection(null);
    setSelectedNode(normalizedNode);
  };

  const handleConnectionClick = (connection: MapConnection) => {
    const fromNode = connection.fromNode ? normalizeCompany(connection.fromNode) ?? undefined : undefined;
    const toNode = connection.toNode ? normalizeCompany(connection.toNode) ?? undefined : undefined;
    console.log('Connection clicked:', connection.id);
    setSelectedNode(null);
    setSelectedConnection({
      ...connection,
      fromNode,
      toNode,
    });
  };

  const handleClosePanel = () => {
    setSelectedNode(null);
    setSelectedConnection(null);
  };

  const handleSupplierFormSuccess = () => {
    setShowSupplierForm(false);
    // Trigger map refresh by incrementing key
    setMapRefreshKey(k => k + 1);
  };

  return (
    <div className="h-screen w-screen bg-bg-primary flex flex-col">
      {/* Header with Add Supply Chain button */}
      <header className="h-14 bg-bg-secondary border-b border-border-color flex items-center justify-between px-4">
        <h1 className="text-accent-cyan font-mono text-lg font-bold">SENTINEL ZERO</h1>
        <button
          onClick={() => setShowSupplierForm(true)}
          className="px-3 py-1 bg-accent-cyan text-bg-primary rounded font-mono text-sm hover:opacity-90"
        >
          + Add Supply Chain
        </button>
      </header>

      {/* Main content area */}
      <div className="flex-1 relative">
        <Map
          key={mapRefreshKey}
          onNodeClick={handleNodeClick}
          onConnectionClick={handleConnectionClick}
          pathEdges={pathEdges as PathEdge[]}
          alternativeSuppliers={effectiveAlternativeSuppliers}
        />
        <DetailPanel
          selectedNode={selectedNode}
          selectedConnection={selectedConnection}
          onClose={handleClosePanel}
          alternativeSuppliers={effectiveAlternativeSuppliers}
          riskyPathEdge={effectiveRiskyPathEdge}
          alternativesLoading={effectiveAlternativesLoading}
          alternativesError={effectiveAlternativesError}
        />
      </div>

      {/* News ticker at bottom */}
      <NewsTicker items={news} />

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
