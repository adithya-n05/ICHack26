import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { socket } from '../../lib/socket';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Debounce delay for batching map updates (ms)
const MAP_UPDATE_DEBOUNCE = 150;

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
}

interface MapProps {
  onNodeClick?: (node: Company) => void;
  onConnectionClick?: (connection: Connection & { fromNode?: Company; toNode?: Company }) => void;
}

export function Map({ onNodeClick, onConnectionClick }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const nodesRef = useRef<Company[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const eventsRef = useRef<GeoEvent[]>([]);
  
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
    return connections
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
      .filter(isNonNull);
  }, [connections, getNodePosition]);

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
            type: event.type,
            severity: event.severity,
            title: event.title,
            source: event.source,
          },
        };
        return feature;
      })
      .filter(isNonNull);
  }, [getEventPosition]);

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
          type: event.type,
          severity: event.severity,
          title: event.title,
          source: event.source,
        },
      }));
  }, []);

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

  // Update only event sources - called by debounced socket handler
  // This doesn't trigger React re-render, preserving map camera state
  const updateEventSources = useCallback(
    (mapInstance: mapboxgl.Map) => {
      const eventsPointSource = mapInstance.getSource('events-points') as mapboxgl.GeoJSONSource | undefined;
      const eventsPolygonSource = mapInstance.getSource('events-polygons') as mapboxgl.GeoJSONSource | undefined;

      eventsPointSource?.setData(buildFeatureCollection(getEventPointFeatures()));
      eventsPolygonSource?.setData(buildFeatureCollection(getEventPolygonFeatures()));
    },
    [buildFeatureCollection, getEventPointFeatures, getEventPolygonFeatures]
  );

  // Update all sources - used for nodes/connections which change less frequently
  const updateSourceData = useCallback(
    (mapInstance: mapboxgl.Map) => {
      const nodesSource = mapInstance.getSource('nodes') as mapboxgl.GeoJSONSource | undefined;
      const connectionsSource = mapInstance.getSource('connections') as mapboxgl.GeoJSONSource | undefined;

      nodesSource?.setData(buildFeatureCollection(getNodeFeatures()));
      connectionsSource?.setData(buildFeatureCollection(getConnectionFeatures()));
      updateEventSources(mapInstance);
    },
    [buildFeatureCollection, getConnectionFeatures, getNodeFeatures, updateEventSources]
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
      mapInstance.addSource('events-points', {
        type: 'geojson',
        data: buildFeatureCollection(getEventPointFeatures()),
      });
      mapInstance.addSource('events-polygons', {
        type: 'geojson',
        data: buildFeatureCollection(getEventPolygonFeatures()),
      });

      mapInstance.addLayer(
        {
          id: 'events-heat',
          type: 'heatmap',
          source: 'events-points',
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
              6, 1.8,
              10, 3.2,
            ],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(255, 255, 255, 0)',
              0.25, 'rgba(200, 200, 200, 0.25)',
              0.5, 'rgba(160, 160, 160, 0.45)',
              0.75, 'rgba(120, 120, 120, 0.65)',
              1, 'rgba(90, 90, 90, 0.85)',
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
              2, 0.7,
              10, 0.9,
              12, 0.4,
            ],
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
        onConnectionClick({ ...connection, fromNode, toNode });
      });

      mapInstance.on('click', 'events-polygons', (event) => {
        const feature = event.features?.[0];
        const title = feature?.properties?.title as string | undefined;
        if (title) {
          console.log('Event clicked:', title);
        }
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [
    buildFeatureCollection,
    getConnectionFeatures,
    getEventPointFeatures,
    getEventPolygonFeatures,
    getNodeFeatures,
    labelLayerId,
    onConnectionClick,
    onNodeClick,
  ]);

  // Update nodes/connections when they change (less frequent, from initial load)
  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      updateSourceData(map.current);
    }
  }, [nodes, connections, updateSourceData]);

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
    </div>
  );
}
