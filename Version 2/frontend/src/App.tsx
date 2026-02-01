import { useState, useEffect } from 'react';
import { Map } from './components/Map';
import { DetailPanel } from './components/DetailPanel';
import { NewsTicker } from './components/NewsTicker';
import { SupplierForm } from './components/SupplierForm';
import { socket } from './lib/socket';
import { usePaths } from './hooks/usePaths';
import { useAlternatives } from './hooks/useAlternatives';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const LOCAL_STORAGE_KEY = 'sentinel-user-connections';

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
  const { edges: pathEdges } = usePaths(selectedNode?.id ?? null);
  const isAmberOrWorse = selectedConnection
    ? ['monitoring', 'at-risk', 'critical', 'disrupted'].includes(selectedConnection.status)
    : false;
  const alternativeMaterial =
    isAmberOrWorse
      ? selectedConnection?.materials?.[0] ?? selectedConnection?.fromNode?.products?.[0] ?? null
      : null;
  const { alternatives } = useAlternatives(alternativeMaterial);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setUserConnections(parsed);
      }
    } catch (err) {
      console.warn('Failed to load user connections:', err);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userConnections));
    } catch (err) {
      console.warn('Failed to persist user connections:', err);
    }
  }, [userConnections]);

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

  const normalizeCompany = (node: MapCompany): Company | null => {
    if (node.location) {
      return { ...node, location: node.location };
    }
    if (typeof node.lat === 'number' && typeof node.lng === 'number') {
      return { ...node, location: { lat: node.lat, lng: node.lng } };
    }
    return null;
  };

  const createUserConnectionId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `user-${crypto.randomUUID()}`;
    }
    return `user-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  };

  const isDuplicateUserConnection = (fromId: string, toId: string) =>
    userConnections.some(
      (connection) =>
        (connection.from_node_id === fromId && connection.to_node_id === toId) ||
        (connection.from_node_id === toId && connection.to_node_id === fromId),
    );

  const handleNodeClick = (node: MapCompany) => {
    const normalizedNode = normalizeCompany(node);
    if (!normalizedNode) {
      console.warn('Skipping node without location:', node.id);
      return;
    }
    console.log('Node clicked:', node.name);

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

      const newConnection: Connection = {
        id: createUserConnectionId(),
        from_node_id: pendingConnection.id,
        to_node_id: normalizedNode.id,
        transport_mode: 'land',
        status: 'healthy',
        is_user_connection: true,
      };

      setUserConnections((prev) => [...prev, newConnection]);
      setSelectedConnection({
        ...newConnection,
        fromNode: pendingConnection,
        toNode: normalizedNode,
      });
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

  const toggleConnectMode = () => {
    setConnectMode((prev) => !prev);
    setPendingConnection(null);
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
        <div className="flex items-center gap-2">
          <button
            onClick={toggleConnectMode}
            className={`px-3 py-1 rounded font-mono text-sm border transition ${
              connectMode
                ? 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan'
                : 'bg-bg-tertiary text-text-primary border-border-color hover:border-accent-cyan/70'
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
          pathEdges={pathEdges}
          alternativeSuppliers={isAmberOrWorse ? alternatives : []}
          userConnections={userConnections}
        />
        {connectMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-bg-secondary/95 border border-border-color px-4 py-3 rounded shadow-lg">
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
        <DetailPanel
          selectedNode={selectedNode}
          selectedConnection={selectedConnection}
          alternativeSuppliers={isAmberOrWorse ? alternatives : []}
          onClose={handleClosePanel}
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
