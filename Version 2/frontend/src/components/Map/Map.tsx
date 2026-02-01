import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ScatterplotLayer, ArcLayer, PolygonLayer } from '@deck.gl/layers';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

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
}

interface GeoEvent {
  id: string;
  type: string;
  title: string;
  location: { lat: number; lng: number };
  severity: number;
  polygon?: Array<{ lat: number; lng: number }>;
}

const EVENT_COLORS: Record<string, [number, number, number, number]> = {
  war: [255, 0, 0, 150],
  natural_disaster: [255, 102, 0, 150],
  weather: [0, 170, 255, 150],
  geopolitical: [153, 0, 255, 150],
  tariff: [255, 204, 0, 150],
  infrastructure: [204, 204, 204, 150],
};

const CONNECTION_STATUS_COLORS: Record<string, [number, number, number, number]> = {
  healthy: [224, 224, 224, 200],
  monitoring: [255, 204, 0, 200],
  'at-risk': [255, 102, 0, 200],
  critical: [255, 0, 0, 200],
  disrupted: [139, 0, 0, 200],
};

function createCirclePolygon(
  center: { lat: number; lng: number },
  radiusKm: number,
  points: number = 32
): Array<[number, number]> {
  const coords: Array<[number, number]> = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = radiusKm * Math.cos(angle) / 111;
    const dy = radiusKm * Math.sin(angle) / 111;
    coords.push([center.lng + dx, center.lat + dy]);
  }
  return coords;
}

interface MapProps {
  onNodeClick?: (node: Company) => void;
  onConnectionClick?: (connection: Connection & { fromNode?: Company; toNode?: Company }) => void;
}

export function Map({ onNodeClick, onConnectionClick }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const deckOverlay = useRef<MapboxOverlay | null>(null);

  const [nodes, setNodes] = useState<Company[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [events, setEvents] = useState<GeoEvent[]>([]);
  const [hoveredNode, setHoveredNode] = useState<Company | null>(null);
  const [animationTime, setAnimationTime] = useState(0);

  // Fetch companies from API
  useEffect(() => {
    fetch(`${API_URL}/api/companies`)
      .then(res => res.json())
      .then(data => {
        console.log('Loaded companies:', data.length);
        setNodes(data);
      })
      .catch(err => console.error('Failed to load companies:', err));
  }, []);

  // Fetch connections from API
  useEffect(() => {
    fetch(`${API_URL}/api/connections`)
      .then(res => res.json())
      .then(data => {
        console.log('Loaded connections:', data.length);
        setConnections(data);
      })
      .catch(err => console.error('Failed to load connections:', err));
  }, []);

  // Fetch events from API
  useEffect(() => {
    fetch(`${API_URL}/api/events`)
      .then(res => res.json())
      .then(data => {
        console.log('Loaded events:', data.length);
        setEvents(data);
      })
      .catch(err => console.error('Failed to load events:', err));
  }, []);

  // Helper to get node position by ID
  const getNodePosition = useCallback((nodeId: string): [number, number] | null => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? [node.location.lng, node.location.lat] : null;
  }, [nodes]);

  const getLayers = useCallback(() => {
    return [
      new ScatterplotLayer<Company>({
        id: 'nodes',
        data: nodes,
        getPosition: (d) => [d.location.lng, d.location.lat],
        getRadius: (d) => (hoveredNode?.id === d.id ? 80000 : 50000),
        radiusMinPixels: 6,
        radiusMaxPixels: 25,
        getFillColor: [0, 255, 255, 200],
        stroked: true,
        getLineColor: [0, 255, 255, 255],
        lineWidthMinPixels: 2,
        pickable: true,
        onHover: (info) => setHoveredNode(info.object || null),
        onClick: (info) => {
          if (info.object && onNodeClick) {
            onNodeClick(info.object);
          }
        },
        updateTriggers: {
          getRadius: hoveredNode?.id,
        },
      }),
      new ArcLayer<Connection>({
        id: 'arcs',
        data: connections.filter(c => {
          const from = getNodePosition(c.from_node_id);
          const to = getNodePosition(c.to_node_id);
          return from && to;
        }),
        getSourcePosition: (d) => getNodePosition(d.from_node_id)!,
        getTargetPosition: (d) => getNodePosition(d.to_node_id)!,
        getSourceColor: (d) => {
          if (d.is_user_connection) return [0, 255, 255, 255];
          return CONNECTION_STATUS_COLORS[d.status] || [224, 224, 224, 200];
        },
        getTargetColor: (d) => {
          if (d.is_user_connection) return [0, 255, 255, 255];
          return CONNECTION_STATUS_COLORS[d.status] || [224, 224, 224, 200];
        },
        getWidth: (d) => d.is_user_connection ? 4 : 2,
        widthMinPixels: 2,
        getHeight: 0.5,
        pickable: true,
        onClick: (info) => {
          if (info.object && onConnectionClick) {
            const fromNode = nodes.find(n => n.id === info.object.from_node_id);
            const toNode = nodes.find(n => n.id === info.object.to_node_id);
            onConnectionClick({
              ...info.object,
              fromNode,
              toNode,
            });
          }
        },
        updateTriggers: {
          getSourceColor: [connections.map(c => c.is_user_connection), connections.map(c => c.status)],
          getTargetColor: [connections.map(c => c.is_user_connection), connections.map(c => c.status)],
          getWidth: connections.map(c => c.is_user_connection),
        },
      }),
      new PolygonLayer({
        id: 'heatmaps',
        data: events.map(e => ({
          ...e,
          contour: e.polygon
            ? e.polygon.map((p) => [p.lng, p.lat])
            : createCirclePolygon(e.location, Math.max(e.severity * 50, 100)),
        })),
        getPolygon: (d: any) => d.contour,
        getFillColor: (d: any) => {
          const baseColor = EVENT_COLORS[d.type] || [128, 128, 128, 150];
          const pulse = Math.sin(animationTime * 2) * 0.2 + 0.8;
          return [baseColor[0], baseColor[1], baseColor[2], baseColor[3] * pulse];
        },
        getLineColor: [255, 255, 255, 80],
        getLineWidth: 2,
        lineWidthMinPixels: 1,
        opacity: 0.6,
        filled: true,
        stroked: true,
        pickable: true,
        onClick: (info: any) => {
          if (info.object) {
            console.log('Event clicked:', info.object.title);
          }
        },
        updateTriggers: {
          getFillColor: animationTime,
        },
      }),
    ];
  }, [nodes, connections, events, hoveredNode, animationTime, onNodeClick, onConnectionClick, getNodePosition]);

  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      setAnimationTime((t) => t + 0.02);
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      projection: 'globe',
      center: [100, 30],
      zoom: 2,
    });

    map.current.on('style.load', () => {
      map.current?.setFog({
        color: 'rgb(13, 13, 13)',
        'high-color': 'rgb(26, 26, 26)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(13, 13, 13)',
        'star-intensity': 0.6,
      });

      deckOverlay.current = new MapboxOverlay({ layers: getLayers() });
      map.current?.addControl(deckOverlay.current as unknown as mapboxgl.IControl);
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (deckOverlay.current) {
      deckOverlay.current.setProps({ layers: getLayers() });
    }
  }, [getLayers]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {hoveredNode && (
        <div className="absolute top-4 left-4 bg-bg-secondary px-3 py-2 rounded border border-border-color">
          <span className="text-accent-cyan font-mono text-sm">{hoveredNode.name}</span>
        </div>
      )}
    </div>
  );
}
