import { useState, useEffect } from 'react';
import { Map } from './components/Map';
import { DetailPanel } from './components/DetailPanel';
import { NewsTicker } from './components/NewsTicker';
import { SupplierForm } from './components/SupplierForm';
import { socket } from './lib/socket';

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
    socket.on('new-news', (items: NewsItem[]) => {
      console.log('Received new news:', items.length);
      setNews(prev => [...items, ...prev].slice(0, 50));
    });

    return () => {
      socket.off('new-news');
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
        />
        <DetailPanel
          selectedNode={selectedNode}
          selectedConnection={selectedConnection}
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
