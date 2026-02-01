import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { socket } from '../../lib/socket';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Debounce delay for batching map updates (ms)
const MAP_UPDATE_DEBOUNCE = 150;
const HEATMAP_RECENT_MONTHS = 6;
const NATURAL_HEATMAP_MAX_MONTHS = 12;

const CUSTOM_WAR_HEATMAP_POINTS: Array<{
  id: string;
  title: string;
  location: { lat: number; lng: number };
  severity: number;
}> = [
    { id: 'war-israel-1', title: 'Israel war zone', location: { lat: 31.5, lng: 35.1 }, severity: 9 },
    { id: 'war-israel-2', title: 'Israel war zone', location: { lat: 32.0, lng: 34.9 }, severity: 8 },
    { id: 'war-israel-3', title: 'Israel war zone', location: { lat: 30.9, lng: 34.8 }, severity: 8 },
    { id: 'war-iran-1', title: 'Iran war zone', location: { lat: 35.7, lng: 51.4 }, severity: 9 },
    { id: 'war-iran-2', title: 'Iran war zone', location: { lat: 34.3, lng: 47.9 }, severity: 8 },
    { id: 'war-iran-3', title: 'Iran war zone', location: { lat: 32.4, lng: 53.7 }, severity: 7 },
    { id: 'war-ukraine-1', title: 'Ukraine war zone', location: { lat: 50.4, lng: 30.5 }, severity: 9 },
    { id: 'war-ukraine-2', title: 'Ukraine war zone', location: { lat: 48.0, lng: 37.8 }, severity: 8 },
    { id: 'war-ukraine-3', title: 'Ukraine war zone', location: { lat: 46.5, lng: 32.6 }, severity: 8 },
    { id: 'war-russia-1', title: 'Russia war zone', location: { lat: 55.8, lng: 37.6 }, severity: 7 },
    { id: 'war-russia-2', title: 'Russia war zone', location: { lat: 50.8, lng: 39.2 }, severity: 8 },
    { id: 'war-russia-3', title: 'Russia war zone', location: { lat: 47.2, lng: 39.7 }, severity: 7 },
  ];

const WAR_AFFECTED_ZONES: Array<{
  id: string;
  name: string;
  polygon: Array<{ lat: number; lng: number }>;
}> = [
    {
      id: 'war-zone-israel',
      name: 'WAR AFFECTED: ISRAEL',
      polygon: [
        { lat: 33.4, lng: 34.2 },
        { lat: 33.4, lng: 36.8 },
        { lat: 29.2, lng: 36.8 },
        { lat: 29.2, lng: 34.2 },
      ],
    },
    {
      id: 'war-zone-iran',
      name: 'WAR AFFECTED: IRAN',
      polygon: [
        { lat: 37.5, lng: 44.8 },
        { lat: 37.5, lng: 54.8 },
        { lat: 29.5, lng: 54.8 },
        { lat: 29.5, lng: 44.8 },
      ],
    },
    {
      id: 'war-zone-ukraine',
      name: 'WAR AFFECTED: UKRAINE',
      polygon: [
        { lat: 52.4, lng: 22.1 },
        { lat: 52.4, lng: 40.2 },
        { lat: 44.2, lng: 40.2 },
        { lat: 44.2, lng: 22.1 },
      ],
    },
    {
      id: 'war-zone-russia',
      name: 'WAR AFFECTED: RUSSIA',
      polygon: [
        { lat: 58.5, lng: 30.0 },
        { lat: 58.5, lng: 47.5 },
        { lat: 46.0, lng: 47.5 },
        { lat: 46.0, lng: 30.0 },
      ],
    },
  ];

const NODE_TYPE_COLORS: Record<string, string> = {
  company: '#00F5FF',
  supplier: '#22C55E',
  factory: '#F97316',
  warehouse: '#FACC15',
  port: '#3B82F6',
  market: '#A855F7',
  hub: '#9CA3AF',
  industrial_site: '#F59E0B',
};

const NODE_TYPE_COLOR_EXPR: mapboxgl.Expression = [
  'match',
  ['get', 'type'],
  'company',
  NODE_TYPE_COLORS.company,
  'supplier',
  NODE_TYPE_COLORS.supplier,
  'factory',
  NODE_TYPE_COLORS.factory,
  'warehouse',
  NODE_TYPE_COLORS.warehouse,
  'port',
  NODE_TYPE_COLORS.port,
  'market',
  NODE_TYPE_COLORS.market,
  'hub',
  NODE_TYPE_COLORS.hub,
  'industrial_site',
  NODE_TYPE_COLORS.industrial_site,
  NODE_TYPE_COLORS.hub,
];

const NODE_TYPE_GLOW_EXPR: mapboxgl.Expression = [
  'match',
  ['get', 'type'],
  'company',
  'rgba(0, 245, 255, 0.5)',
  'supplier',
  'rgba(34, 197, 94, 0.45)',
  'factory',
  'rgba(249, 115, 22, 0.45)',
  'warehouse',
  'rgba(250, 204, 21, 0.45)',
  'port',
  'rgba(59, 130, 246, 0.45)',
  'market',
  'rgba(168, 85, 247, 0.45)',
  'hub',
  'rgba(156, 163, 175, 0.4)',
  'industrial_site',
  'rgba(245, 158, 11, 0.45)',
  'rgba(156, 163, 175, 0.4)',
];

interface Company {
  id: string;
  name: string;
  type: string;
  location?: { lat: number; lng: number };
  lat?: number | null;
  lng?: number | null;
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

interface PathEdge {
  id: string;
  fromNodeId?: string;
  toNodeId?: string;
  from_node_id?: string;
  to_node_id?: string;
  status?: string;
  transportMode?: string;
  transport_mode?: string;
  isUserConnection?: boolean;
  is_user_connection?: boolean;
}

interface AlternativeSupplier {
  id: string;
  name: string;
  location?: { lat: number; lng: number };
  lat?: number | null;
  lng?: number | null;
}

interface GeoEvent {
  id: string;
  type: string;
  title: string;
  location?: { lat: number; lng: number };
  lat?: number | null;
  lng?: number | null;
  severity: number;
  startDate?: string;
  endDate?: string;
  source?: string;
  polygon?: Array<{ lat: number; lng: number }>;
  source?: string;
}

interface MapProps {
  onNodeClick?: (node: Company) => void;
  onConnectionClick?: (connection: Connection & { fromNode?: Company; toNode?: Company }) => void;
  pathEdges?: PathEdge[];
  alternativeSuppliers?: AlternativeSupplier[];
  userConnections?: Connection[];
}

export function Map({
  onNodeClick,
  onConnectionClick,
  pathEdges = [],
  alternativeSuppliers = [],
  userConnections = [],
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const heatmapPopupRef = useRef<mapboxgl.Popup | null>(null);
  const selectionPopupRef = useRef<mapboxgl.Popup | null>(null);
  const nodesRef = useRef<Company[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const eventsRef = useRef<GeoEvent[]>([]);
  const pathEdgesRef = useRef<PathEdge[]>([]);
  const alternativeSuppliersRef = useRef<AlternativeSupplier[]>([]);
  const onNodeClickRef = useRef(onNodeClick);
  const onConnectionClickRef = useRef(onConnectionClick);

  // Pending events buffer for batching socket updates
  const pendingNewEvents = useRef<GeoEvent[]>([]);
  const pendingUpdatedEvents = useRef<Record<string, GeoEvent>>({});
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [nodes, setNodes] = useState<Company[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  // events state only used for initial load - map updates happen via refs
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<Company | null>(null);
  const isNonNull = <T,>(value: T | null): value is T => value !== null;

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

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

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

  const mergedConnections = useMemo(
    () => [...connections, ...userConnections],
    [connections, userConnections]
  );

  useEffect(() => {
    connectionsRef.current = mergedConnections;
  }, [mergedConnections]);

  useEffect(() => {
    pathEdgesRef.current = pathEdges;
  }, [pathEdges]);

  useEffect(() => {
    alternativeSuppliersRef.current = alternativeSuppliers;
  }, [alternativeSuppliers]);

  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);

  useEffect(() => {
    onConnectionClickRef.current = onConnectionClick;
  }, [onConnectionClick]);

  // Fetch events from API
  useEffect(() => {
    fetch(`${API_URL}/api/events`)
      .then(res => res.json())
      .then(data => {
        console.log('Loaded events:', data.length);
        eventsRef.current = data;
        setEventsLoaded(true);
        // Initial map update after load
        if (map.current?.isStyleLoaded()) {
          updateEventSources(map.current);
        }
      })
      .catch(err => console.error('Failed to load events:', err));

    // Flush pending batched updates to the map
    const flushEventUpdates = () => {
      if (!map.current?.isStyleLoaded()) return;

      // Apply pending new events
      if (pendingNewEvents.current.length > 0) {
        eventsRef.current = [...pendingNewEvents.current, ...eventsRef.current];
        pendingNewEvents.current = [];
      }

      // Apply pending updates
      const pendingKeys = Object.keys(pendingUpdatedEvents.current);
      if (pendingKeys.length > 0) {
        eventsRef.current = eventsRef.current.map(e =>
          pendingUpdatedEvents.current[e.id] ?? e
        );
        pendingUpdatedEvents.current = {};
      }

      // Update map sources (doesn't trigger React re-render)
      updateEventSources(map.current!);
    };

    // Schedule a debounced map update
    const scheduleMapUpdate = () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      updateTimerRef.current = setTimeout(flushEventUpdates, MAP_UPDATE_DEBOUNCE);
    };

    // Named handlers for proper cleanup - batch events instead of immediate state updates
    const handleNewEvent = (event: GeoEvent) => {
      console.log('Received new event:', event.title);
      pendingNewEvents.current.push(event);
      scheduleMapUpdate();
    };

    const handleEventUpdate = (updatedEvent: GeoEvent) => {
      pendingUpdatedEvents.current[updatedEvent.id] = updatedEvent;
      scheduleMapUpdate();
    };

    // Listen for real-time event updates
    socket.on('new-event', handleNewEvent);
    socket.on('event-update', handleEventUpdate);

    return () => {
      socket.off('new-event', handleNewEvent);
      socket.off('event-update', handleEventUpdate);
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  // Helper to get node position by ID
  const getCompanyPosition = useCallback((company: Company): [number, number] | null => {
    if (company.location) {
      return [company.location.lng, company.location.lat];
    }
    if (typeof company.lat === 'number' && typeof company.lng === 'number') {
      return [company.lng, company.lat];
    }
    return null;
  }, []);

  const getEventPosition = useCallback((event: GeoEvent): { lat: number; lng: number } | null => {
    if (event.location) {
      return event.location;
    }
    if (typeof event.lat === 'number' && typeof event.lng === 'number') {
      return { lat: event.lat, lng: event.lng };
    }
    return null;
  }, []);

  const normalizeEventType = useCallback((value?: string | number | null) => {
    if (value === null || value === undefined) return 'unknown';
    if (typeof value === 'number') {
      const numericMap: Record<number, string> = {
        1: 'war',
        2: 'natural_disaster',
        3: 'weather',
        4: 'geopolitical',
        5: 'tariff',
        6: 'infrastructure',
      };
      return numericMap[value] ?? 'unknown';
    }
    const normalized = value.toString().trim().toLowerCase();
    if (!normalized) return 'unknown';
    if (/^\d+$/.test(normalized)) {
      const numeric = Number(normalized);
      const numericMap: Record<number, string> = {
        1: 'war',
        2: 'natural_disaster',
        3: 'weather',
        4: 'geopolitical',
        5: 'tariff',
        6: 'infrastructure',
      };
      return numericMap[numeric] ?? 'unknown';
    }
    if (normalized === 'trade') return 'tariff';
    if (normalized === 'disaster') return 'natural_disaster';
    return normalized;
  }, []);

  const formatEventType = useCallback((value?: string | number | null) => {
    const normalized = normalizeEventType(value);
    if (!normalized || normalized === 'unknown') return 'Unknown';
    return normalized
      .split('_')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }, [normalizeEventType]);

  const classifyEventSubtype = useCallback((event: GeoEvent) => {
    const title = (event.title || '').toLowerCase();
    if (title.includes('tsunami')) return 'Tsunami';
    if (title.includes('earthquake') || title.includes('m ')) return 'Earthquake';
    if (title.includes('volcan')) return 'Volcano';
    if (title.includes('wildfire') || title.includes('fire')) return 'Wildfire';
    if (title.includes('flood')) return 'Flood';
    if (title.includes('hurricane') || title.includes('typhoon') || title.includes('cyclone')) {
      return 'Cyclone';
    }
    if (title.includes('tornado')) return 'Tornado';
    if (title.includes('storm')) return 'Storm';
    if (title.includes('landslide') || title.includes('mudslide')) return 'Landslide';
    if (title.includes('drought')) return 'Drought';
    if (title.includes('avalanche')) return 'Avalanche';
    if (title.includes('heat wave') || title.includes('heatwave')) return 'Heat Wave';
    if (title.includes('blizzard') || title.includes('snow')) return 'Blizzard';
    return formatEventType(event.type);
  }, [formatEventType]);

  const extractMagnitudeFromTitle = useCallback((title?: string) => {
    if (!title) return null;
    const match = title.match(/m\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (!match) return null;
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : null;
  }, []);

  const formatEventDateRange = useCallback((startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return 'Date unavailable';
    if (startDate && endDate) return `${startDate} → ${endDate}`;
    return startDate || endDate || 'Date unavailable';
  }, []);

  const isRecentEvent = useCallback((event: GeoEvent) => {
    const dateString = event.startDate || event.endDate;
    if (!dateString) return false;
    const parsed = Date.parse(dateString);
    if (Number.isNaN(parsed)) return false;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - HEATMAP_RECENT_MONTHS);
    return parsed >= cutoff.getTime();
  }, []);

  const isRecentNaturalEvent = useCallback((event: GeoEvent) => {
    const dateString = event.startDate || event.endDate;
    if (!dateString) return false;
    const parsed = Date.parse(dateString);
    if (Number.isNaN(parsed)) return false;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - NATURAL_HEATMAP_MAX_MONTHS);
    return parsed >= cutoff.getTime();
  }, []);

  const getNodePosition = useCallback((nodeId: string): [number, number] | null => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? getCompanyPosition(node) : null;
  }, [nodes, getCompanyPosition]);

  const getNodeFeatures = useCallback(() => {
    return nodes
      .map((node) => {
        const pos = getCompanyPosition(node);
        if (!pos) return null;
        const feature: GeoJSON.Feature<GeoJSON.Point> = {
          type: 'Feature' as const,
          id: node.id,
          geometry: { type: 'Point' as const, coordinates: pos },
          properties: {
            id: node.id,
            name: node.name,
            type: node.type,
          },
        };
        return feature;
      })
      .filter(isNonNull);
  }, [nodes, getCompanyPosition]);

  const getConnectionFeatures = useCallback(() => {
    return mergedConnections
      .map((connection) => {
        const from = getNodePosition(connection.from_node_id);
        const to = getNodePosition(connection.to_node_id);
        if (!from || !to) return null;
        const feature: GeoJSON.Feature<GeoJSON.LineString> = {
          type: 'Feature' as const,
          id: connection.id,
          geometry: {
            type: 'LineString' as const,
            coordinates: [from, to],
          },
          properties: {
            id: connection.id,
            status: connection.status,
            is_user_connection: connection.is_user_connection,
            from_node_id: connection.from_node_id,
            to_node_id: connection.to_node_id,
          },
        };
        return feature;
      })
      .filter((feature): feature is GeoJSON.Feature<GeoJSON.LineString> => feature !== null);
  }, [getNodePosition, mergedConnections]);

  const getPathFeatures = useCallback(() => {
    return pathEdgesRef.current
      .map((edge) => {
        const fromId = edge.fromNodeId ?? edge.from_node_id;
        const toId = edge.toNodeId ?? edge.to_node_id;
        if (!fromId || !toId) return null;
        const from = getNodePosition(fromId);
        const to = getNodePosition(toId);
        if (!from || !to) return null;
        return {
          type: 'Feature' as const,
          id: edge.id,
          geometry: {
            type: 'LineString' as const,
            coordinates: [from, to],
          },
          properties: {
            id: edge.id,
            status: edge.status,
            from_node_id: fromId,
            to_node_id: toId,
            transport_mode: edge.transportMode ?? edge.transport_mode,
            is_user_connection: edge.isUserConnection ?? edge.is_user_connection ?? false,
          },
        };
      })
      .filter((feature): feature is GeoJSON.Feature<GeoJSON.LineString> => feature !== null);
  }, [getNodePosition]);

  const getAlternativeFeatures = useCallback(() => {
    return alternativeSuppliersRef.current
      .map((supplier) => {
        const location = supplier.location
          ? [supplier.location.lng, supplier.location.lat]
          : typeof supplier.lat === 'number' && typeof supplier.lng === 'number'
            ? [supplier.lng, supplier.lat]
            : null;
        if (!location) return null;
        return {
          type: 'Feature' as const,
          id: supplier.id,
          geometry: {
            type: 'Point' as const,
            coordinates: location,
          },
          properties: {
            id: supplier.id,
            name: supplier.name,
          },
        };
      })
      .filter((feature): feature is GeoJSON.Feature<GeoJSON.Point> => feature !== null);
  }, []);

  const getEventPointFeatures = useCallback((eventsData: GeoEvent[] = eventsRef.current) => {
    return eventsData
      .map((event) => {
        const location = getEventPosition(event);
        if (!location) return null;
        const feature: GeoJSON.Feature<GeoJSON.Point> = {
          type: 'Feature' as const,
          id: event.id,
          geometry: {
            type: 'Point' as const,
            coordinates: [location.lng, location.lat],
          },
          properties: {
            id: event.id,
            type: normalizeEventType(event.type),
            severity: event.severity,
            title: event.title,
            source: event.source,
          },
        };
        return feature;
      })
      .filter((feature): feature is GeoJSON.Feature<GeoJSON.Point> => feature !== null);
  }, [getEventPosition, normalizeEventType]);

  const getHeatmapEventPointFeatures = useCallback(
    (
      types: string[],
      includeCustomWar: boolean = false,
      isRecentOverride?: (event: GeoEvent) => boolean,
    ) => {
      const filtered = eventsRef.current.filter((event) => {
        const normalizedType = normalizeEventType(event.type);
        const isRecent = isRecentOverride ? isRecentOverride(event) : isRecentEvent(event);
        return types.includes(normalizedType) && isRecent;
      });

      const baseFeatures = getEventPointFeatures(filtered);

      if (!includeCustomWar) return baseFeatures;

      const customFeatures: GeoJSON.Feature<GeoJSON.Point>[] = CUSTOM_WAR_HEATMAP_POINTS.map((point) => ({
        type: 'Feature' as const,
        id: point.id,
        geometry: {
          type: 'Point' as const,
          coordinates: [point.location.lng, point.location.lat],
        },
        properties: {
          id: point.id,
          type: 'war',
          severity: point.severity,
          title: point.title,
          source: 'Manual',
        },
      }));

      return [...baseFeatures, ...customFeatures];
    },
    [getEventPointFeatures, isRecentEvent, normalizeEventType]
  );

  const getEventPolygonFeatures = useCallback((eventsData: GeoEvent[] = eventsRef.current) => {
    return eventsData
      .filter((event) => event.polygon && event.polygon.length >= 3)
      .map((event) => ({
        type: 'Feature' as const,
        id: `${event.id}-polygon`,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[...event.polygon!, event.polygon![0]].map((point) => [point.lng, point.lat])],
        },
        properties: {
          id: event.id,
          type: normalizeEventType(event.type),
          severity: event.severity,
          title: event.title,
          source: event.source,
        },
      }));
  }, [normalizeEventType]);

  const summarizeHeatmap = useCallback(
    (
      lng: number,
      lat: number,
      zoom: number,
      allowedTypes: string[],
      includeCustomWar: boolean,
      isRecentOverride?: (event: GeoEvent) => boolean,
    ) => {
      const radiusKm = Math.max(80, 2500 / Math.pow(1.6, zoom));
      const within = eventsRef.current.filter((event) => {
        const normalizedType = normalizeEventType(event.type);
        if (!allowedTypes.includes(normalizedType)) return false;
        const isRecent = isRecentOverride ? isRecentOverride(event) : isRecentEvent(event);
        if (!isRecent) return false;
        const location = getEventPosition(event);
        if (!location) return false;
        const dLat = (location.lat - lat) * (Math.PI / 180);
        const dLng = (location.lng - lng) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat * (Math.PI / 180)) *
          Math.cos(location.lat * (Math.PI / 180));
        const c = 2 * Math.asin(Math.sqrt(a));
        const distanceKm = 6371 * c;
        return distanceKm <= radiusKm;
      });

      const customEvents = includeCustomWar
        ? CUSTOM_WAR_HEATMAP_POINTS.map((point) => ({
          id: point.id,
          type: 'war',
          title: point.title,
          location: point.location,
          severity: point.severity,
          startDate: new Date().toISOString(),
        }))
        : [];

      const merged = [...within, ...customEvents];
      const count = merged.length;
      const avgSeverity =
        count === 0 ? 0 : merged.reduce((sum, event) => sum + (event.severity || 0), 0) / count;
      const typeCounts = merged.reduce<Record<string, number>>((acc, event) => {
        const key = classifyEventSubtype(event as GeoEvent) || 'Unknown';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});
      const topTypes = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      const eventTimestamps = merged
        .map((event) => event.startDate || event.endDate)
        .filter((value): value is string => Boolean(value))
        .map((value) => Date.parse(value))
        .filter((value) => !Number.isNaN(value))
        .sort((a, b) => a - b);
      const oldest = eventTimestamps[0];
      const newest = eventTimestamps[eventTimestamps.length - 1];

      let sumLat = 0;
      let sumLng = 0;
      let locationCount = 0;
      let magnitudeSum = 0;
      let magnitudeCount = 0;
      for (const event of merged) {
        const location = getEventPosition(event as GeoEvent);
        if (!location) continue;
        sumLat += location.lat;
        sumLng += location.lng;
        locationCount += 1;

        if (classifyEventSubtype(event as GeoEvent) === 'Earthquake') {
          const magnitude = extractMagnitudeFromTitle((event as GeoEvent).title);
          if (typeof magnitude === 'number') {
            magnitudeSum += magnitude;
            magnitudeCount += 1;
          }
        }
      }
      const centerLat = locationCount ? sumLat / locationCount : null;
      const centerLng = locationCount ? sumLng / locationCount : null;
      const averageMagnitude = magnitudeCount ? magnitudeSum / magnitudeCount : null;

      return {
        count,
        avgSeverity,
        topTypes,
        radiusKm,
        dateStart: Number.isFinite(oldest) ? new Date(oldest).toISOString() : null,
        dateEnd: Number.isFinite(newest) ? new Date(newest).toISOString() : null,
        centerLat,
        centerLng,
        averageMagnitude,
      };
    },
    [classifyEventSubtype, extractMagnitudeFromTitle, getEventPosition, isRecentEvent, normalizeEventType],
  );

  const closeSelectionPopup = useCallback(() => {
    if (selectionPopupRef.current) {
      selectionPopupRef.current.remove();
      selectionPopupRef.current = null;
    }
  }, []);

  const openSelectionPopup = useCallback(
    (mapInstance: mapboxgl.Map, lngLat: mapboxgl.LngLatLike, html: string) => {
      closeSelectionPopup();
      selectionPopupRef.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
        .setLngLat(lngLat)
        .setHTML(html)
        .addTo(mapInstance);
    },
    [closeSelectionPopup],
  );

  const buildFeatureCollection = useCallback(
    <T extends GeoJSON.Geometry>(features: GeoJSON.Feature<T>[]) => ({
      type: 'FeatureCollection' as const,
      features,
    }),
    []
  );

  const labelLayerId = useCallback((mapInstance: mapboxgl.Map) => {
    const layers = mapInstance.getStyle().layers;
    if (!layers) return undefined;
    const labelLayer = layers.find((layer) => layer.type === 'symbol' && layer.layout?.['text-field']);
    return labelLayer?.id;
  }, []);

  const enhanceMapDetail = useCallback((mapInstance: mapboxgl.Map) => {
    const layers = mapInstance.getStyle().layers || [];
    const denseTextSize: mapboxgl.Expression = [
      'interpolate',
      ['linear'],
      ['zoom'],
      2, 9,
      4, 10,
      6, 12,
      8, 13,
      10, 14,
      12, 16,
    ];

    layers.forEach((layer) => {
      if (layer.type === 'symbol' && layer.layout?.['text-field']) {
        mapInstance.setLayoutProperty(layer.id, 'text-allow-overlap', true);
        mapInstance.setLayoutProperty(layer.id, 'text-ignore-placement', true);
        mapInstance.setLayoutProperty(layer.id, 'icon-allow-overlap', true);
        mapInstance.setLayoutProperty(layer.id, 'text-size', denseTextSize);
        mapInstance.setPaintProperty(layer.id, 'text-color', '#b5bcc6');
        mapInstance.setPaintProperty(layer.id, 'text-halo-color', '#0a0b0d');
        mapInstance.setPaintProperty(layer.id, 'text-halo-width', 1);
      }

      if (layer.type === 'line') {
        const idLower = layer.id.toLowerCase();
        if (idLower.includes('road') || idLower.includes('street') || idLower.includes('bridge')) {
          mapInstance.setPaintProperty(layer.id, 'line-opacity', 0.85);
          mapInstance.setPaintProperty(layer.id, 'line-color', '#9aa3ad');
          mapInstance.setPaintProperty(layer.id, 'line-width', [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, 0.4,
            8, 0.8,
            12, 1.4,
            16, 3,
          ]);
        }
      }
    });
  }, []);

  const getBearing = useCallback((from: [number, number], to: [number, number]) => {
    const [fromLng, fromLat] = from.map((value) => (value * Math.PI) / 180);
    const [toLng, toLat] = to.map((value) => (value * Math.PI) / 180);
    const y = Math.sin(toLng - fromLng) * Math.cos(toLat);
    const x =
      Math.cos(fromLat) * Math.sin(toLat) -
      Math.sin(fromLat) * Math.cos(toLat) * Math.cos(toLng - fromLng);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  }, []);

  const getPathEndpointFeatures = useCallback(() => {
    return pathEdgesRef.current
      .map((edge) => {
        const fromId = edge.fromNodeId ?? edge.from_node_id;
        const toId = edge.toNodeId ?? edge.to_node_id;
        if (!fromId || !toId) return null;
        const from = getNodePosition(fromId);
        const to = getNodePosition(toId);
        if (!from || !to) return null;
        return {
          type: 'Feature' as const,
          id: `${edge.id}-arrow`,
          geometry: {
            type: 'Point' as const,
            coordinates: to,
          },
          properties: {
            id: edge.id,
            status: edge.status,
            bearing: getBearing(from, to),
          },
        };
      })
      .filter((feature): feature is GeoJSON.Feature<GeoJSON.Point> => feature !== null);
  }, [getBearing, getNodePosition]);

  // Update only event sources - called by debounced socket handler
  // This doesn't trigger React re-render, preserving map camera state
  const updateEventSources = useCallback(
    (mapInstance: mapboxgl.Map) => {
      const eventsPointSource = mapInstance.getSource('events-points') as mapboxgl.GeoJSONSource | undefined;
      const eventsPolygonSource = mapInstance.getSource('events-polygons') as mapboxgl.GeoJSONSource | undefined;
      const warHeatSource = mapInstance.getSource('events-heatmap-war') as mapboxgl.GeoJSONSource | undefined;
      const naturalHeatSource = mapInstance.getSource('events-heatmap-natural') as mapboxgl.GeoJSONSource | undefined;

      const eventPoints = getEventPointFeatures();
      const eventPolygons = getEventPolygonFeatures();
      const warHeatFeatures = getHeatmapEventPointFeatures(['war'], true);
      const naturalHeatFeatures = getHeatmapEventPointFeatures(
        ['natural_disaster', 'weather'],
        false,
        isRecentNaturalEvent,
      );

      console.log('Heatmap sources', {
        events: eventsRef.current.length,
        eventPoints: eventPoints.length,
        eventPolygons: eventPolygons.length,
        warHeat: warHeatFeatures.length,
        naturalHeat: naturalHeatFeatures.length,
      });

      eventsPointSource?.setData(buildFeatureCollection(eventPoints));
      eventsPolygonSource?.setData(buildFeatureCollection(eventPolygons));
      warHeatSource?.setData(buildFeatureCollection(warHeatFeatures));
      naturalHeatSource?.setData(buildFeatureCollection(naturalHeatFeatures));
    },
    [
      buildFeatureCollection,
      getEventPointFeatures,
      getEventPolygonFeatures,
      getHeatmapEventPointFeatures,
      isRecentNaturalEvent,
    ]
  );

  // Update all sources - used for nodes/connections which change less frequently
  const updateSourceData = useCallback(
    (mapInstance: mapboxgl.Map) => {
      const nodesSource = mapInstance.getSource('nodes') as mapboxgl.GeoJSONSource | undefined;
      const connectionsSource = mapInstance.getSource('connections') as mapboxgl.GeoJSONSource | undefined;
      const pathsSource = mapInstance.getSource('paths') as mapboxgl.GeoJSONSource | undefined;
      const alternativesSource = mapInstance.getSource('alternatives') as
        | mapboxgl.GeoJSONSource
        | undefined;
      const pathEndpointsSource = mapInstance.getSource('path-endpoints') as
        | mapboxgl.GeoJSONSource
        | undefined;

      nodesSource?.setData(buildFeatureCollection(getNodeFeatures()));
      connectionsSource?.setData(buildFeatureCollection(getConnectionFeatures()));
      pathsSource?.setData(buildFeatureCollection(getPathFeatures()));
      alternativesSource?.setData(buildFeatureCollection(getAlternativeFeatures()));
      pathEndpointsSource?.setData(buildFeatureCollection(getPathEndpointFeatures()));
      updateEventSources(mapInstance);
    },
    [
      buildFeatureCollection,
      getAlternativeFeatures,
      getConnectionFeatures,
      getNodeFeatures,
      getPathEndpointFeatures,
      getPathFeatures,
      updateEventSources,
    ]
  );

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      projection: 'globe',
      center: [100, 30],
      zoom: 2.8,
      pitch: 0,
    });

    map.current.once('load', () => {
      map.current?.setFog({
        color: 'rgb(13, 13, 13)',
        'high-color': 'rgb(26, 26, 26)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(13, 13, 13)',
        'star-intensity': 0.6,
      });
      const mapInstance = map.current;
      if (!mapInstance) return;

      enhanceMapDetail(mapInstance);
      const beforeId = labelLayerId(mapInstance);

      if (!mapInstance.getSource('mapbox-dem')) {
        mapInstance.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.terrain-rgb',
          tileSize: 512,
          maxzoom: 14,
        });
      }

      if (!mapInstance.getLayer('terrain-hillshade')) {
        mapInstance.addLayer(
          {
            id: 'terrain-hillshade',
            type: 'hillshade',
            source: 'mapbox-dem',
            paint: {
              'hillshade-exaggeration': 0.2,
              'hillshade-shadow-color': '#0a0b0d',
              'hillshade-highlight-color': '#1b1f24',
              'hillshade-accent-color': '#111418',
            },
          },
          beforeId
        );
      }

      if (!mapInstance.getLayer('3d-buildings')) {
        mapInstance.addLayer(
          {
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 15,
            paint: {
              'fill-extrusion-color': '#1a1d22',
              'fill-extrusion-opacity': 0.85,
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15, 0,
                15.05, ['get', 'height'],
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15, 0,
                15.05, ['get', 'min_height'],
              ],
            },
          },
          beforeId
        );
      }

      mapInstance.addSource('nodes', {
        type: 'geojson',
        data: buildFeatureCollection(getNodeFeatures()),
      });
      mapInstance.addSource('connections', {
        type: 'geojson',
        data: buildFeatureCollection(getConnectionFeatures()),
      });
      mapInstance.addSource('paths', {
        type: 'geojson',
        data: buildFeatureCollection(getPathFeatures()),
      });
      mapInstance.addSource('alternatives', {
        type: 'geojson',
        data: buildFeatureCollection(getAlternativeFeatures()),
      });
      mapInstance.addSource('path-endpoints', {
        type: 'geojson',
        data: buildFeatureCollection(getPathEndpointFeatures()),
      });
      mapInstance.addSource('events-points', {
        type: 'geojson',
        data: buildFeatureCollection(getEventPointFeatures()),
      });
      mapInstance.addSource('events-polygons', {
        type: 'geojson',
        data: buildFeatureCollection(getEventPolygonFeatures()),
      });
      mapInstance.addSource('events-heatmap-war', {
        type: 'geojson',
        data: buildFeatureCollection(getHeatmapEventPointFeatures(['war'], true)),
      });
      mapInstance.addSource('events-heatmap-natural', {
        type: 'geojson',
        data: buildFeatureCollection(
          getHeatmapEventPointFeatures(['natural_disaster', 'weather'], false, isRecentNaturalEvent)
        ),
      });
      mapInstance.addSource('war-affected-zones', {
        type: 'geojson',
        data: buildFeatureCollection(
          WAR_AFFECTED_ZONES.map((zone) => ({
            type: 'Feature' as const,
            id: zone.id,
            geometry: {
              type: 'Polygon' as const,
              coordinates: [[...zone.polygon, zone.polygon[0]].map((point) => [point.lng, point.lat])],
            },
            properties: {
              id: zone.id,
              name: zone.name,
              type: 'war',
            },
          }))
        ),
      });

      mapInstance.addLayer(
        {
          id: 'events-heat-war',
          type: 'heatmap',
          source: 'events-heatmap-war',
          maxzoom: 12,
          paint: {
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              ['coalesce', ['get', 'severity'], 1],
              0, 0,
              10, 1,
            ],
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 0.7,
              6, 2.3,
              10, 4.0,
            ],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(255, 64, 64, 0)',
              0.25, 'rgba(255, 64, 64, 0.35)',
              0.5, 'rgba(255, 0, 90, 0.55)',
              0.75, 'rgba(190, 0, 80, 0.75)',
              1, 'rgba(130, 0, 60, 0.9)',
            ],
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 14,
              6, 55,
              10, 120,
            ],
            'heatmap-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              2, 0.85,
              10, 1,
              12, 0.6,
            ],
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: 'events-heat-natural',
          type: 'heatmap',
          source: 'events-heatmap-natural',
          maxzoom: 12,
          paint: {
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              ['coalesce', ['get', 'severity'], 1],
              0, 0,
              10, 1,
            ],
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 0.6,
              6, 2.0,
              10, 3.6,
            ],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(64, 255, 200, 0)',
              0.25, 'rgba(64, 255, 200, 0.35)',
              0.5, 'rgba(0, 200, 170, 0.55)',
              0.75, 'rgba(0, 150, 140, 0.75)',
              1, 'rgba(0, 90, 120, 0.9)',
            ],
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 14,
              6, 50,
              10, 110,
            ],
            'heatmap-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              2, 0.8,
              10, 0.95,
              12, 0.55,
            ],
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: 'war-affected-zones',
          type: 'fill',
          source: 'war-affected-zones',
          paint: {
            'fill-color': 'rgba(255, 38, 38, 0.35)',
            'fill-outline-color': 'rgba(255, 60, 60, 0.95)',
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: 'war-affected-zones-outline',
          type: 'line',
          source: 'war-affected-zones',
          paint: {
            'line-color': 'rgba(255, 80, 80, 0.95)',
            'line-width': 2,
            'line-opacity': 0.9,
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: 'war-affected-zones-labels',
          type: 'symbol',
          source: 'war-affected-zones',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 12,
            'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
            'text-allow-overlap': true,
            'text-ignore-placement': true,
          },
          paint: {
            'text-color': '#ffb3b3',
            'text-halo-color': '#0a0b0d',
            'text-halo-width': 1,
          },
        },
        beforeId
      );

      const heatmapLayerConfigs = [
        { id: 'events-heat-war', types: ['war'], includeCustomWar: true, label: 'War Heatmap' },
        {
          id: 'events-heat-natural',
          types: ['natural_disaster', 'weather'],
          includeCustomWar: false,
          label: 'Natural Events Heatmap',
          isRecentOverride: isRecentNaturalEvent,
        },
      ];

      const handleHeatmapClick = (
        event: mapboxgl.MapMouseEvent,
        types: string[],
        includeCustomWar: boolean,
        label: string,
        isRecentOverride?: (event: GeoEvent) => boolean,
      ) => {
        const lng = event.lngLat.lng;
        const lat = event.lngLat.lat;
        const {
          count,
          avgSeverity,
          topTypes,
          radiusKm,
          dateStart,
          dateEnd,
          centerLat,
          centerLng,
          averageMagnitude,
        } = summarizeHeatmap(
          lng,
          lat,
          mapInstance.getZoom(),
          types,
          includeCustomWar,
          isRecentOverride,
        );

        if (heatmapPopupRef.current) {
          heatmapPopupRef.current.remove();
        }

        const topTypeText =
          topTypes.length === 0
            ? 'No events in range'
            : topTypes
              .map(([type, value]) => `${type}: ${value}`)
              .join(', ');
        const dateText = formatEventDateRange(dateStart || undefined, dateEnd || undefined);
        const locationText =
          typeof centerLat === 'number' && typeof centerLng === 'number'
            ? `${centerLat.toFixed(2)}, ${centerLng.toFixed(2)}`
            : 'N/A';
        const magnitudeText =
          typeof averageMagnitude === 'number' ? averageMagnitude.toFixed(1) : 'N/A';

        heatmapPopupRef.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat([lng, lat])
          .setHTML(
            `<div style="font-family: monospace; font-size: 12px;">
              <div style="font-weight: 700; margin-bottom: 4px;">${label}</div>
              <div>Radius: ${Math.round(radiusKm)} km</div>
              <div>Events: ${count}</div>
              <div>Avg magnitude (quakes): ${magnitudeText}</div>
              <div>Top types (count): ${topTypeText}</div>
              <div>Date range: ${dateText}</div>
              <div>Location: ${locationText}</div>
            </div>`,
          )
          .addTo(mapInstance);
      };

      heatmapLayerConfigs.forEach(({ id, types, includeCustomWar, label, isRecentOverride }) => {
        mapInstance.on('click', id, (event) =>
          handleHeatmapClick(event, types, includeCustomWar, label, isRecentOverride),
        );
      });

      mapInstance.addLayer(
        {
          id: 'connections-glow',
          type: 'line',
          source: 'connections',
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': [
              'case',
              ['boolean', ['get', 'is_user_connection'], false],
              'rgba(0, 255, 209, 0.85)',
              [
                'match',
                ['get', 'status'],
                'healthy', 'rgba(224, 224, 224, 0.6)',
                'monitoring', 'rgba(255, 204, 0, 0.7)',
                'at-risk', 'rgba(255, 102, 0, 0.7)',
                'critical', 'rgba(255, 0, 0, 0.7)',
                'disrupted', 'rgba(153, 0, 0, 0.7)',
                'rgba(200, 200, 200, 0.6)',
              ],
            ],
            'line-width': ['case', ['boolean', ['get', 'is_user_connection'], false], 11, 5],
            'line-blur': 3.8,
            'line-opacity': 0.9,
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: 'alternatives',
          type: 'circle',
          source: 'alternatives',
          paint: {
            'circle-radius': 6,
            'circle-color': 'rgba(0, 255, 128, 0.95)',
            'circle-stroke-color': 'rgba(0, 255, 128, 1)',
            'circle-stroke-width': 1,
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: 'paths-glow',
          type: 'line',
          source: 'paths',
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': [
              'match',
              ['get', 'status'],
              'healthy', 'rgba(224, 224, 224, 0.75)',
              'monitoring', 'rgba(255, 204, 0, 0.85)',
              'at-risk', 'rgba(255, 102, 0, 0.85)',
              'critical', 'rgba(255, 0, 0, 0.85)',
              'disrupted', 'rgba(153, 0, 0, 0.85)',
              'rgba(200, 200, 200, 0.75)',
            ],
            'line-width': 7.5,
            'line-blur': 3.2,
            'line-opacity': 0.9,
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: 'connections',
          type: 'line',
          source: 'connections',
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': [
              'case',
              ['boolean', ['get', 'is_user_connection'], false],
              'rgba(0, 255, 209, 1)',
              [
                'match',
                ['get', 'status'],
                'healthy', 'rgba(224, 224, 224, 0.9)',
                'monitoring', 'rgba(255, 204, 0, 0.95)',
                'at-risk', 'rgba(255, 102, 0, 0.95)',
                'critical', 'rgba(255, 0, 0, 0.95)',
                'disrupted', 'rgba(153, 0, 0, 0.95)',
                'rgba(220, 220, 220, 0.9)',
              ],
            ],
            'line-width': ['case', ['boolean', ['get', 'is_user_connection'], false], 4.2, 2.2],
            'line-opacity': 0.98,
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: 'connections-direction',
          type: 'symbol',
          source: 'connections',
          layout: {
            'symbol-placement': 'line',
            'symbol-spacing': 100,
            'text-field': '▶',
            'text-size': 11,
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-keep-upright': false,
            'text-rotation-alignment': 'map',
          },
          paint: {
            'text-color': [
              'case',
              ['boolean', ['get', 'is_user_connection'], false],
              'rgba(0, 255, 209, 0.95)',
              [
                'match',
                ['get', 'status'],
                'healthy', 'rgba(224, 224, 224, 0.95)',
                'monitoring', 'rgba(255, 204, 0, 0.95)',
                'at-risk', 'rgba(255, 102, 0, 0.95)',
                'critical', 'rgba(255, 0, 0, 0.95)',
                'disrupted', 'rgba(153, 0, 0, 0.95)',
                'rgba(220, 220, 220, 0.95)',
              ],
            ],
            'text-halo-color': 'rgba(0, 0, 0, 0.6)',
            'text-halo-width': 1,
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: 'connections-hitbox',
          type: 'line',
          source: 'connections',
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': 'rgba(0, 0, 0, 0)',
            'line-width': ['case', ['boolean', ['get', 'is_user_connection'], false], 16, 12],
            'line-opacity': 0.01,
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: 'paths',
          type: 'line',
          source: 'paths',
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': [
              'match',
              ['get', 'status'],
              'healthy', 'rgba(224, 224, 224, 1)',
              'monitoring', 'rgba(255, 204, 0, 1)',
              'at-risk', 'rgba(255, 102, 0, 1)',
              'critical', 'rgba(255, 0, 0, 1)',
              'disrupted', 'rgba(153, 0, 0, 1)',
              'rgba(220, 220, 220, 1)',
            ],
            'line-width': 3.2,
            'line-opacity': 0.98,
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: 'paths-hitbox',
          type: 'line',
          source: 'paths',
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': 'rgba(0, 0, 0, 0)',
            'line-width': 15,
            'line-opacity': 0.01,
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: 'paths-direction',
          type: 'symbol',
          source: 'paths',
          layout: {
            'symbol-placement': 'line',
            'symbol-spacing': 90,
            'text-field': '▶',
            'text-size': 12,
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-keep-upright': false,
            'text-rotation-alignment': 'map',
          },
          paint: {
            'text-color': [
              'match',
              ['get', 'status'],
              'healthy', 'rgba(224, 224, 224, 0.95)',
              'monitoring', 'rgba(255, 204, 0, 0.95)',
              'at-risk', 'rgba(255, 102, 0, 0.95)',
              'critical', 'rgba(255, 0, 0, 0.95)',
              'disrupted', 'rgba(153, 0, 0, 0.95)',
              'rgba(220, 220, 220, 0.95)',
            ],
            'text-halo-color': 'rgba(0, 0, 0, 0.6)',
            'text-halo-width': 1,
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: 'paths-arrowhead',
          type: 'symbol',
          source: 'path-endpoints',
          layout: {
            'text-field': '➤',
            'text-size': 14,
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-rotation-alignment': 'map',
            'text-keep-upright': false,
            'text-rotate': ['get', 'bearing'],
          },
          paint: {
            'text-color': [
              'match',
              ['get', 'status'],
              'healthy', 'rgba(230, 230, 230, 1)',
              'monitoring', 'rgba(255, 214, 0, 1)',
              'at-risk', 'rgba(255, 126, 0, 1)',
              'critical', 'rgba(255, 40, 0, 1)',
              'disrupted', 'rgba(153, 0, 0, 1)',
              'rgba(220, 220, 220, 1)',
            ],
            'text-halo-color': 'rgba(0, 0, 0, 0.6)',
            'text-halo-width': 1,
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: 'nodes-glow',
          type: 'circle',
          source: 'nodes',
          paint: {
            'circle-radius': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              12,
              8,
            ],
            'circle-color': NODE_TYPE_GLOW_EXPR,
            'circle-blur': 0.6,
            'circle-opacity': 0.8,
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: 'nodes',
          type: 'circle',
          source: 'nodes',
          paint: {
            'circle-radius': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              6,
              4,
            ],
            'circle-color': NODE_TYPE_COLOR_EXPR,
            'circle-stroke-color': NODE_TYPE_COLOR_EXPR,
            'circle-stroke-width': 1,
          },
        },
        beforeId
      );

      let hoveredNodeId: string | number | null = null;
      mapInstance.on('mousemove', 'nodes', (event) => {
        const feature = event.features?.[0];
        if (!feature) return;

        if (hoveredNodeId !== null) {
          mapInstance.setFeatureState({ source: 'nodes', id: hoveredNodeId }, { hover: false });
        }
        hoveredNodeId = feature.id ?? null;
        if (hoveredNodeId !== null) {
          mapInstance.setFeatureState({ source: 'nodes', id: hoveredNodeId }, { hover: true });
        }

        const nodeId = feature.properties?.id as string | undefined;
        if (nodeId) {
          const node = nodesRef.current.find((n) => n.id === nodeId) || null;
          setHoveredNode(node);
        }
        mapInstance.getCanvas().style.cursor = 'pointer';
      });

      mapInstance.on('mouseleave', 'nodes', () => {
        if (hoveredNodeId !== null) {
          mapInstance.setFeatureState({ source: 'nodes', id: hoveredNodeId }, { hover: false });
        }
        hoveredNodeId = null;
        setHoveredNode(null);
        mapInstance.getCanvas().style.cursor = '';
      });

      mapInstance.on('click', 'nodes', (event) => {
        const feature = event.features?.[0];
        const nodeId = feature?.properties?.id as string | undefined;
        if (!nodeId) return;
        const node = nodesRef.current.find((n) => n.id === nodeId);
        const clickHandler = onNodeClickRef.current;
        if (node && clickHandler) {
          const locationText =
            node.city && node.country ? `${node.city}, ${node.country}` : 'Location unavailable';
          openSelectionPopup(
            mapInstance,
            event.lngLat,
            `<div style="font-family: monospace; font-size: 12px;">
              <div style="font-weight: 700; margin-bottom: 4px;">${node.name}</div>
              <div style="color: #9aa3ad; text-transform: uppercase; font-size: 10px; letter-spacing: 0.08em;">
                ${node.type}
              </div>
              <div style="margin-top: 4px;">${locationText}</div>
            </div>`,
          );
          clickHandler(node);
        }
      });

      mapInstance.on('mouseenter', 'connections-hitbox', () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });

      mapInstance.on('mouseleave', 'connections-hitbox', () => {
        mapInstance.getCanvas().style.cursor = '';
      });

      mapInstance.on('click', 'connections-hitbox', (event) => {
        const feature = event.features?.[0];
        const connectionId = feature?.properties?.id as string | undefined;
        const clickHandler = onConnectionClickRef.current;
        if (!connectionId || !clickHandler) return;
        const connection = connectionsRef.current.find((c) => c.id === connectionId);
        if (!connection) return;
        const fromNode = nodesRef.current.find((n) => n.id === connection.from_node_id);
        const toNode = nodesRef.current.find((n) => n.id === connection.to_node_id);
        const fromName = fromNode?.name || connection.from_node_id;
        const toName = toNode?.name || connection.to_node_id;
        const fromLocation =
          fromNode?.city && fromNode?.country ? `${fromNode.city}, ${fromNode.country}` : 'Location unavailable';
        const toLocation =
          toNode?.city && toNode?.country ? `${toNode.city}, ${toNode.country}` : 'Location unavailable';
        openSelectionPopup(
          mapInstance,
          event.lngLat,
          `<div style="font-family: monospace; font-size: 12px;">
            <div style="font-weight: 700; margin-bottom: 4px;">Route</div>
            <div>${fromName} → ${toName}</div>
            <div style="color: #9aa3ad; margin-top: 4px;">${fromLocation} → ${toLocation}</div>
            <div style="margin-top: 6px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.08em; color: #9aa3ad;">
              ${connection.transport_mode} • ${connection.status}
            </div>
          </div>`,
        );
        clickHandler({ ...connection, fromNode, toNode });
      });

      mapInstance.on('movestart', () => {
        closeSelectionPopup();
      });

    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update nodes/connections when they change (less frequent, from initial load)
  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      updateSourceData(map.current);
    }
  }, [nodes, connections, pathEdges, alternativeSuppliers, userConnections, updateSourceData]);

  // Initial event load - only runs once when eventsLoaded becomes true
  useEffect(() => {
    if (eventsLoaded && map.current?.isStyleLoaded()) {
      updateEventSources(map.current);
    }
  }, [eventsLoaded, updateEventSources]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {hoveredNode && (
        <div className="absolute top-4 left-4 bg-bg-secondary px-3 py-2 rounded border border-border-color">
          <span className="text-accent-cyan font-mono text-sm">{hoveredNode.name}</span>
        </div>
      )}
      <div className="absolute bottom-4 left-4 bg-bg-secondary/95 px-3 py-3 rounded border border-border-color">
        <div className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Node Legend
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {[
            { type: 'company', label: 'Company' },
            { type: 'supplier', label: 'Supplier' },
            { type: 'factory', label: 'Factory' },
            { type: 'warehouse', label: 'Warehouse' },
            { type: 'port', label: 'Port' },
            { type: 'market', label: 'Market' },
            { type: 'industrial_site', label: 'Industrial' },
            { type: 'hub', label: 'Hub' },
          ].map((item) => (
            <div key={item.type} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: NODE_TYPE_COLORS[item.type] ?? NODE_TYPE_COLORS.hub }}
              />
              <span className="text-text-primary text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
