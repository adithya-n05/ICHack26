import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { socket } from '../../lib/socket';
import { buildWarZoneEvent, pickNearestWarZone, WarZonePoint } from '../../lib/heatmapEvents';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Debounce delay for batching map updates (ms)
const MAP_UPDATE_DEBOUNCE = 150;
const HEATMAP_RECENT_MONTHS = 6;

const CUSTOM_WAR_HEATMAP_POINTS: WarZonePoint[] = [
  { id: 'war-israel-1', title: 'Israel war zone', location: { lat: 31.5, lng: 35.1 }, severity: 9 },
  { id: 'war-israel-2', title: 'Israel war zone', location: { lat: 32.0, lng: 34.9 }, severity: 8 },
  { id: 'war-israel-3', title: 'Israel war zone', location: { lat: 30.9, lng: 34.8 }, severity: 8 },
  { id: 'war-iran-1', title: 'Iran war zone', location: { lat: 35.7, lng: 51.4 }, severity: 9 },
  { id: 'war-iran-2', title: 'Iran war zone', location: { lat: 34.3, lng: 47.9 }, severity: 8 },
  { id: 'war-iran-3', title: 'Iran war zone', location: { lat: 32.4, lng: 53.7 }, severity: 7 },
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
  transportMode?: string;
  transport_mode?: string;
  status: string;
  isUserConnection?: boolean;
  is_user_connection?: boolean;
}

interface GeoEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  location?: { lat: number; lng: number };
  lat?: number | null;
  lng?: number | null;
  severity: number;
  startDate?: string;
  endDate?: string;
  source?: string;
  polygon?: Array<{ lat: number; lng: number }>;
}

interface MapProps {
  onNodeClick?: (node: Company) => void;
  onConnectionClick?: (connection: Connection & { fromNode?: Company; toNode?: Company }) => void;
  onEventClick?: (event: GeoEvent) => void;
  pathEdges?: PathEdge[];
  alternativeSuppliers?: Company[];
}

export function Map({
  onNodeClick,
  onConnectionClick,
  onEventClick,
  pathEdges = [],
  alternativeSuppliers = [],
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const nodesRef = useRef<Company[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const eventsRef = useRef<GeoEvent[]>([]);
  const dashAnimationRef = useRef<number | null>(null);

  // Pending events buffer for batching socket updates
  const pendingNewEvents = useRef<GeoEvent[]>([]);
  const pendingUpdatedEvents = useRef<Record<string, GeoEvent>>({});
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [nodes, setNodes] = useState<Company[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  // events state only used for initial load - map updates happen via refs
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<Company | null>(null);
  const [heatmapTooltip, setHeatmapTooltip] = useState<{
    event: GeoEvent;
    screenX: number;
    screenY: number;
  } | null>(null);

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

  const findEventById = useCallback((eventId?: string | null) => {
    if (!eventId) return null;
    return eventsRef.current.find((event) => event.id === eventId) || null;
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

  const formatEventDate = useCallback((value?: string) => {
    if (!value) return 'Unknown';
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return value;
    return new Date(parsed).toLocaleDateString();
  }, []);

  const formatLastEventDate = useCallback(
    (event: GeoEvent) => formatEventDate(event.endDate ?? event.startDate),
    [formatEventDate]
  );

  const getWarZoneFallbackEvent = useCallback((click: { lat: number; lng: number }) => {
    const nearest = pickNearestWarZone(click, CUSTOM_WAR_HEATMAP_POINTS);
    return nearest ? buildWarZoneEvent(nearest) : null;
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

  const getNodePosition = useCallback((nodeId: string): [number, number] | null => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    return node ? getCompanyPosition(node) : null;
  }, [getCompanyPosition]);

  const getNodeFeatures = useCallback(() => {
    return nodesRef.current
      .map((node) => {
        const pos = getCompanyPosition(node);
        if (!pos) return null;
        return {
          type: 'Feature' as const,
          id: node.id,
          geometry: { type: 'Point' as const, coordinates: pos },
          properties: {
            id: node.id,
            name: node.name,
            type: node.type,
          },
        };
      })
      .filter((feature): feature is GeoJSON.Feature<GeoJSON.Point> => feature !== null);
  }, [getCompanyPosition]);

  const getAlternativeFeatures = useCallback(() => {
    return alternativeSuppliers
      .map((supplier) => {
        const pos = getCompanyPosition(supplier);
        if (!pos) return null;
        return {
          type: 'Feature' as const,
          id: supplier.id,
          geometry: { type: 'Point' as const, coordinates: pos },
          properties: {
            id: supplier.id,
            name: supplier.name,
            type: supplier.type,
          },
        };
      })
      .filter((feature): feature is GeoJSON.Feature<GeoJSON.Point> => feature !== null);
  }, [alternativeSuppliers, getCompanyPosition]);

  const getConnectionFeatures = useCallback(() => {
    return connectionsRef.current
      .map((connection) => {
        const from = getNodePosition(connection.from_node_id);
        const to = getNodePosition(connection.to_node_id);
        if (!from || !to) return null;
        return {
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
      })
      .filter((feature): feature is GeoJSON.Feature<GeoJSON.LineString> => feature !== null);
  }, [getNodePosition]);

  const getPathFeatures = useCallback(() => {
    return pathEdges
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
  }, [getNodePosition, pathEdges]);

  const getEventPointFeatures = useCallback((eventsData: GeoEvent[] = eventsRef.current) => {
    return eventsData
      .map((event) => {
        const location = getEventPosition(event);
        if (!location) return null;
        return {
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
      })
      .filter((feature): feature is GeoJSON.Feature<GeoJSON.Point> => feature !== null);
  }, [getEventPosition, normalizeEventType]);

  const getHeatmapEventPointFeatures = useCallback(
    (types: string[], includeCustomWar: boolean = false) => {
      const filtered = eventsRef.current.filter((event) => {
        const normalizedType = normalizeEventType(event.type);
        return types.includes(normalizedType) && isRecentEvent(event);
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

  const startPathDashAnimation = useCallback((mapInstance: mapboxgl.Map) => {
    const dashSequence: number[][] = [
      [1.6, 3],
      [2.2, 3],
      [2.8, 3],
      [3.4, 3],
      [2.8, 3],
      [2.2, 3],
    ];

    let step = 0;
    let lastTime = 0;
    const frameDelay = 120;

    const setDash = (layerId: string, dash: number[]) => {
      if (!mapInstance.getLayer(layerId)) return;
      mapInstance.setPaintProperty(layerId, 'line-dasharray', dash);
    };

    const animate = (time: number) => {
      if (time - lastTime >= frameDelay) {
        step = (step + 1) % dashSequence.length;
        const dash = dashSequence[step];
        setDash('paths', dash);
        setDash('paths-glow', dash);
        setDash('connections', dash);
        setDash('connections-glow', dash);
        lastTime = time;
      }
      dashAnimationRef.current = requestAnimationFrame(animate);
    };

    dashAnimationRef.current = requestAnimationFrame(animate);
  }, []);

  // Update only event sources - called by debounced socket handler
  // This doesn't trigger React re-render, preserving map camera state
  const updateEventSources = useCallback(
    (mapInstance: mapboxgl.Map) => {
      const eventsPointSource = mapInstance.getSource('events-points') as mapboxgl.GeoJSONSource | undefined;
      const eventsPolygonSource = mapInstance.getSource('events-polygons') as mapboxgl.GeoJSONSource | undefined;
      const warHeatSource = mapInstance.getSource('events-heatmap-war') as mapboxgl.GeoJSONSource | undefined;
      const naturalHeatSource = mapInstance.getSource('events-heatmap-natural') as mapboxgl.GeoJSONSource | undefined;

      eventsPointSource?.setData(buildFeatureCollection(getEventPointFeatures()));
      eventsPolygonSource?.setData(buildFeatureCollection(getEventPolygonFeatures()));
      warHeatSource?.setData(buildFeatureCollection(getHeatmapEventPointFeatures(['war'], true)));
      naturalHeatSource?.setData(
        buildFeatureCollection(getHeatmapEventPointFeatures(['natural_disaster', 'weather']))
      );
    },
    [buildFeatureCollection, getEventPointFeatures, getEventPolygonFeatures, getHeatmapEventPointFeatures]
  );

  // Update all sources - used for nodes/connections which change less frequently
  const updateSourceData = useCallback(
    (mapInstance: mapboxgl.Map) => {
      const nodesSource = mapInstance.getSource('nodes') as mapboxgl.GeoJSONSource | undefined;
      const connectionsSource = mapInstance.getSource('connections') as mapboxgl.GeoJSONSource | undefined;
      const pathEdgesSource = mapInstance.getSource('path-edges') as mapboxgl.GeoJSONSource | undefined;
      const alternativesSource = mapInstance.getSource('alternatives') as mapboxgl.GeoJSONSource | undefined;

      nodesSource?.setData(buildFeatureCollection(getNodeFeatures()));
      connectionsSource?.setData(buildFeatureCollection(getConnectionFeatures()));
      pathEdgesSource?.setData(buildFeatureCollection(getPathFeatures()));
      alternativesSource?.setData(buildFeatureCollection(getAlternativeFeatures()));
      updateEventSources(mapInstance);
    },
    [
      buildFeatureCollection,
      getAlternativeFeatures,
      getConnectionFeatures,
      getNodeFeatures,
      getPathFeatures,
      updateEventSources,
    ]
  );

  // Fetch companies from API
  useEffect(() => {
    fetch(`${API_URL}/api/companies`)
      .then(res => res.json())
      .then(data => {
        console.log('Loaded companies:', data.length);
        setNodes(data);
      })
      .catch(err => console.error('Failed to load companies:', err));
  }, [updateEventSources]);

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
  }, [updateEventSources]);

  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

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
  }, [updateEventSources]);

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
      mapInstance.addSource('path-edges', {
        type: 'geojson',
        data: buildFeatureCollection(getPathFeatures()),
      });
      mapInstance.addSource('alternatives', {
        type: 'geojson',
        data: buildFeatureCollection(getAlternativeFeatures()),
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
        data: buildFeatureCollection(getHeatmapEventPointFeatures(['natural_disaster', 'weather'])),
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
              0, 0.6,
              6, 2.0,
              10, 3.5,
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
              0, 6,
              6, 28,
              10, 65,
            ],
            'heatmap-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              2, 0.8,
              10, 0.95,
              12, 0.45,
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
              0, 0.5,
              6, 1.7,
              10, 3,
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
              0, 6,
              6, 26,
              10, 60,
            ],
            'heatmap-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              2, 0.65,
              10, 0.9,
              12, 0.35,
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

      mapInstance.addLayer(
        {
          id: 'events-points',
          type: 'circle',
          source: 'events-points',
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 2,
              6, 4,
              10, 8,
            ],
            'circle-color': [
              'case',
              ['==', ['get', 'source'], 'GDELT'],
              [
                'match',
                ['get', 'type'],
                'war', '#FF3366',
                'natural_disaster', '#FF884D',
                'weather', '#33CCFF',
                'geopolitical', '#B266FF',
                'tariff', '#FFD84D',
                'infrastructure', '#BFBFBF',
                '#E0E0E0',
              ],
              [
                'match',
                ['get', 'type'],
                'war', '#FF0000',
                'natural_disaster', '#FF6600',
                'weather', '#00AAFF',
                'geopolitical', '#9900FF',
                'tariff', '#FFCC00',
                'infrastructure', '#CCCCCC',
                '#E0E0E0',
              ],
            ],
            'circle-opacity': 0.9,
            'circle-stroke-color': '#0D0D0D',
            'circle-stroke-width': 0.5,
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: 'events-polygons',
          type: 'fill',
          source: 'events-polygons',
          paint: {
            'fill-color': [
              'case',
              ['==', ['get', 'source'], 'GDELT'],
              [
                'match',
                ['get', 'type'],
                'war', 'rgba(255, 51, 102, 0.4)',
                'natural_disaster', 'rgba(255, 136, 77, 0.4)',
                'weather', 'rgba(51, 204, 255, 0.35)',
                'geopolitical', 'rgba(178, 102, 255, 0.35)',
                'tariff', 'rgba(255, 216, 77, 0.35)',
                'infrastructure', 'rgba(191, 191, 191, 0.35)',
                'rgba(128, 128, 128, 0.35)',
              ],
              [
                'match',
                ['get', 'type'],
                'war', 'rgba(255, 0, 0, 0.4)',
                'natural_disaster', 'rgba(255, 102, 0, 0.4)',
                'weather', 'rgba(0, 170, 255, 0.35)',
                'geopolitical', 'rgba(153, 0, 255, 0.35)',
                'tariff', 'rgba(255, 204, 0, 0.35)',
                'infrastructure', 'rgba(204, 204, 204, 0.35)',
                'rgba(128, 128, 128, 0.35)',
              ],
            ],
            'fill-opacity': 0.6,
          },
        },
        beforeId
      );

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
              'rgba(0, 255, 255, 0.7)',
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
            'line-width': ['case', ['boolean', ['get', 'is_user_connection'], false], 6, 4],
            'line-blur': 2.5,
            'line-opacity': 0.7,
            'line-dasharray': [1.6, 3],
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
              'rgba(0, 255, 255, 1)',
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
            'line-width': ['case', ['boolean', ['get', 'is_user_connection'], false], 2.5, 1.5],
            'line-opacity': 0.9,
            'line-dasharray': [1.6, 3],
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
              'rgba(0, 255, 255, 0.95)',
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
          id: 'paths-glow',
          type: 'line',
          source: 'path-edges',
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': [
              'match',
              ['get', 'status'],
              'healthy', 'rgba(224, 224, 224, 0.8)',
              'monitoring', 'rgba(255, 204, 0, 0.85)',
              'at-risk', 'rgba(255, 102, 0, 0.85)',
              'critical', 'rgba(255, 0, 0, 0.9)',
              'disrupted', 'rgba(153, 0, 0, 0.9)',
              'rgba(224, 224, 224, 0.8)',
            ],
            'line-width': 6,
            'line-blur': 3.5,
            'line-opacity': 0.85,
            'line-dasharray': [1.6, 3],
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: 'paths',
          type: 'line',
          source: 'path-edges',
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
              'rgba(224, 224, 224, 1)',
            ],
            'line-width': 2.8,
            'line-opacity': 0.95,
            'line-dasharray': [1.6, 3],
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: 'paths-direction',
          type: 'symbol',
          source: 'path-edges',
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
              'rgba(224, 224, 224, 0.95)',
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
            'circle-color': 'rgba(0, 255, 255, 0.45)',
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
            'circle-color': 'rgba(0, 255, 255, 0.95)',
            'circle-stroke-color': 'rgba(0, 255, 255, 1)',
            'circle-stroke-width': 1,
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: 'alternatives-glow',
          type: 'circle',
          source: 'alternatives',
          paint: {
            'circle-radius': 10,
            'circle-color': 'rgba(0, 255, 0, 0.45)',
            'circle-blur': 0.7,
            'circle-opacity': 0.9,
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
            'circle-radius': 5,
            'circle-color': 'rgba(0, 255, 0, 0.95)',
            'circle-stroke-color': 'rgba(0, 255, 0, 1)',
            'circle-stroke-width': 1,
          },
        },
        beforeId
      );

      startPathDashAnimation(mapInstance);

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
        if (node && onNodeClick) {
          setHeatmapTooltip(null);
          onNodeClick(node);
        }
      });

      mapInstance.on('click', 'connections', (event) => {
        const feature = event.features?.[0];
        const connectionId = feature?.properties?.id as string | undefined;
        if (!connectionId || !onConnectionClick) return;
        const connection = connectionsRef.current.find((c) => c.id === connectionId);
        if (!connection) return;
        const fromNode = nodesRef.current.find((n) => n.id === connection.from_node_id);
        const toNode = nodesRef.current.find((n) => n.id === connection.to_node_id);
        setHeatmapTooltip(null);
        onConnectionClick({ ...connection, fromNode, toNode });
      });

      const setEventSelection = (eventData: GeoEvent, point: mapboxgl.Point) => {
        setHeatmapTooltip({
          event: eventData,
          screenX: point.x,
          screenY: point.y,
        });
        onEventClick?.(eventData);
      };

      const heatmapLayerConfigs = [
        { id: 'events-heat-war', types: ['war'] },
        { id: 'events-heat-natural', types: ['natural_disaster', 'weather'] },
      ];
      const setHeatmapCursor = () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      };
      const clearHeatmapCursor = () => {
        mapInstance.getCanvas().style.cursor = '';
      };
      const handleHeatmapClick = (event: mapboxgl.MapMouseEvent, allowedTypes: string[]) => {
        const zoom = mapInstance.getZoom();
        const pickRadius = Math.max(8, Math.min(22, zoom * 1.4 + 6));
        const bbox: [mapboxgl.PointLike, mapboxgl.PointLike] = [
          [event.point.x - pickRadius, event.point.y - pickRadius],
          [event.point.x + pickRadius, event.point.y + pickRadius],
        ];
        const features = mapInstance.queryRenderedFeatures(bbox, { layers: ['events-points'] });
        if (!features.length) {
          setHeatmapTooltip(null);
          return;
        }

        let nearest: mapboxgl.MapboxGeoJSONFeature | null = null;
        let nearestDistance = Number.POSITIVE_INFINITY;

        features.forEach((feature) => {
          if (feature.geometry?.type !== 'Point') return;
          const eventId = feature.properties?.id as string | undefined;
          const eventData = findEventById(eventId);
          if (!eventData) return;
          const normalizedType = normalizeEventType(eventData.type);
          if (!allowedTypes.includes(normalizedType)) return;
          if (!isRecentEvent(eventData)) return;

          const [lng, lat] = feature.geometry.coordinates as [number, number];
          const projected = mapInstance.project({ lng, lat });
          const dx = projected.x - event.point.x;
          const dy = projected.y - event.point.y;
          const distance = dx * dx + dy * dy;
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = feature;
          }
        });

        const eventId = nearest?.properties?.id as string | undefined;
        let eventData = eventId ? findEventById(eventId) : null;
        if (!eventData && allowedTypes.includes('war')) {
          eventData = getWarZoneFallbackEvent({
            lat: event.lngLat.lat,
            lng: event.lngLat.lng,
          });
        }
        if (eventData) {
          setEventSelection(eventData, event.point);
        } else {
          setHeatmapTooltip(null);
        }
      };

      heatmapLayerConfigs.forEach(({ id, types }) => {
        mapInstance.on('mouseenter', id, setHeatmapCursor);
        mapInstance.on('mouseleave', id, clearHeatmapCursor);
        mapInstance.on('click', id, (event) => handleHeatmapClick(event, types));
      });

      mapInstance.on('click', 'events-polygons', (event) => {
        const feature = event.features?.[0];
        const eventId = feature?.properties?.id as string | undefined;
        const eventData = findEventById(eventId);
        if (eventData) {
          setEventSelection(eventData, event.point);
        }
      });

      mapInstance.on('movestart', () => {
        setHeatmapTooltip(null);
      });
    });

    return () => {
      if (dashAnimationRef.current !== null) {
        cancelAnimationFrame(dashAnimationRef.current);
      }
      map.current?.remove();
      map.current = null;
    };
  }, [
    buildFeatureCollection,
    enhanceMapDetail,
    startPathDashAnimation,
    getAlternativeFeatures,
    getConnectionFeatures,
    getEventPointFeatures,
    getEventPolygonFeatures,
    getHeatmapEventPointFeatures,
    getNodeFeatures,
    getPathFeatures,
    labelLayerId,
    findEventById,
    isRecentEvent,
    normalizeEventType,
    onConnectionClick,
    onEventClick,
    onNodeClick,
  ]);

  // Update nodes/connections when they change (less frequent, from initial load)
  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      updateSourceData(map.current);
    }
  }, [nodes, connections, pathEdges, alternativeSuppliers, updateSourceData]);

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
      {heatmapTooltip && (
        <div
          className="absolute z-20 max-w-[240px] bg-bg-secondary border border-border-color rounded px-3 py-2 shadow-lg pointer-events-none"
          style={{
            left: heatmapTooltip.screenX + 12,
            top: heatmapTooltip.screenY + 12,
          }}
        >
          <div className="text-accent-cyan font-mono text-xs uppercase tracking-wide">
            Heatmap Event
          </div>
          <div className="text-text-primary text-sm font-semibold mt-1">
            {heatmapTooltip.event.title}
          </div>
          <div className="text-text-secondary text-xs mt-1">
            Category: {formatEventType(heatmapTooltip.event.type)} • Severity{' '}
            {heatmapTooltip.event.severity}
          </div>
          {heatmapTooltip.event.source && (
            <div className="text-text-secondary text-xs mt-1">
              Source: {heatmapTooltip.event.source}
            </div>
          )}
          <div className="text-text-secondary text-xs mt-1">
            Start: {formatEventDate(heatmapTooltip.event.startDate)}
          </div>
          <div className="text-text-secondary text-xs mt-1">
            Last event: {formatLastEventDate(heatmapTooltip.event)}
          </div>
        </div>
      )}
    </div>
  );
}
