import { useRef, useEffect, useCallback, useState } from 'react';
import Map, { Source, Layer, Marker, Popup } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAppStore } from '@/store';
import { supplyNodes, supplyRoutes, riskZones } from '@/data/mockSupplyChain';
import type { SupplyNode, RiskZone } from '@/types';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Convert routes to GeoJSON
function routesToGeoJSON(routes: typeof supplyRoutes, impactedRoutes: string[]) {
  return {
    type: 'FeatureCollection' as const,
    features: routes.map((route) => ({
      type: 'Feature' as const,
      properties: {
        id: route.id,
        name: route.name,
        isImpacted: impactedRoutes.includes(route.id),
        criticality: route.criticality,
        status: route.status,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: route.waypoints.map((wp) => [wp.lng, wp.lat]),
      },
    })),
  };
}

// Convert risk zones to GeoJSON points for heatmap
function riskZonesToGeoJSON(zones: RiskZone[]) {
  return {
    type: 'FeatureCollection' as const,
    features: zones.map((zone) => ({
      type: 'Feature' as const,
      properties: {
        id: zone.id,
        name: zone.name,
        severity: zone.severity,
        type: zone.type,
        description: zone.description,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [zone.center.lng, zone.center.lat],
      },
    })),
  };
}

// Node marker component
function NodeMarker({ node, isImpacted, onClick }: { node: SupplyNode; isImpacted: boolean; onClick: () => void }) {
  const typeColors = {
    supplier: isImpacted ? 'border-red-500 shadow-red-500/50' : 'border-cyan-500 shadow-cyan-500/50',
    destination: 'border-green-500 shadow-green-500/50',
    port: 'border-amber-500 shadow-amber-500/50',
    checkpoint: 'border-slate-400 shadow-slate-400/50',
    warehouse: 'border-purple-500 shadow-purple-500/50',
  };

  const typeIcons = {
    supplier: '⚙',
    destination: '🏢',
    port: '⚓',
    checkpoint: '📍',
    warehouse: '📦',
  };

  const bgColor = isImpacted ? 'bg-red-900' : 'bg-slate-900';

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer group transition-transform hover:scale-125`}
    >
      {/* Pulse ring for impacted nodes */}
      {isImpacted && (
        <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
      )}

      {/* High risk pulse */}
      {node.riskScore > 70 && !isImpacted && (
        <div className="absolute inset-0 rounded-full bg-amber-500 animate-ping opacity-20" />
      )}

      {/* Main marker */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center
                    ${bgColor} border-2 ${typeColors[node.type]}
                    shadow-lg transition-all`}
      >
        <span className="text-sm">{typeIcons[node.type]}</span>
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                      opacity-0 group-hover:opacity-100 transition-opacity z-50
                      bg-slate-800 px-2 py-1 rounded text-xs text-white whitespace-nowrap
                      border border-slate-600 shadow-xl">
        <div className="font-medium">{node.name}</div>
        <div className="text-slate-400 text-[10px]">{node.country}</div>
      </div>
    </div>
  );
}

export function MapContainer() {
  const mapRef = useRef<MapRef>(null);
  const [popupInfo, setPopupInfo] = useState<SupplyNode | RiskZone | null>(null);
  const { impactedRoutes, impactedSuppliers, selectedRoute, setSelectedRoute, setSelectedNode } = useAppStore();

  const routesGeoJSON = routesToGeoJSON(supplyRoutes, impactedRoutes);
  const riskZonesGeoJSON = riskZonesToGeoJSON(riskZones);

  // Animate route dash offset
  const [dashOffset, setDashOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDashOffset((prev) => (prev + 1) % 20);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handleNodeClick = useCallback((node: SupplyNode) => {
    setSelectedNode(node.id);
    setPopupInfo(node);
  }, [setSelectedNode]);

  const handleMapClick = useCallback((e: mapboxgl.MapLayerMouseEvent) => {
    // Check for route click
    const features = e.features;
    if (features && features.length > 0) {
      const feature = features[0];
      if (feature.layer?.id?.includes('route')) {
        setSelectedRoute(feature.properties?.id || null);
      } else if (feature.layer?.id?.includes('risk')) {
        const zone = riskZones.find(z => z.id === feature.properties?.id);
        if (zone) setPopupInfo(zone);
      }
    }
  }, [setSelectedRoute]);

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: 80,
        latitude: 25,
        zoom: 2,
        pitch: 30,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      mapboxAccessToken={MAPBOX_TOKEN}
      fog={{
        color: 'rgb(10, 10, 20)',
        'high-color': 'rgb(30, 20, 50)',
        'horizon-blend': 0.1,
      }}
      interactiveLayerIds={['routes-normal', 'routes-impacted', 'risk-circles']}
      onClick={handleMapClick}
    >
      {/* Risk Zone Heatmap */}
      <Source id="risk-zones" type="geojson" data={riskZonesGeoJSON}>
        <Layer
          id="risk-heatmap"
          type="heatmap"
          maxzoom={9}
          paint={{
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'severity'], 0, 0, 100, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0,0,0,0)',
              0.1, 'rgba(255,150,0,0.2)',
              0.3, 'rgba(255,100,0,0.4)',
              0.5, 'rgba(255,60,0,0.6)',
              0.7, 'rgba(255,30,0,0.8)',
              1, 'rgba(255,0,0,1)',
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 30, 9, 80],
            'heatmap-opacity': 0.7,
          }}
        />
        <Layer
          id="risk-circles"
          type="circle"
          minzoom={4}
          paint={{
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 10, 10, 25],
            'circle-color': [
              'interpolate', ['linear'], ['get', 'severity'],
              0, '#fef08a',
              50, '#f97316',
              100, '#dc2626',
            ],
            'circle-opacity': 0.6,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-blur': 0.3,
          }}
        />
      </Source>

      {/* Normal Routes */}
      <Source
        id="routes-normal"
        type="geojson"
        data={{
          type: 'FeatureCollection',
          features: routesGeoJSON.features.filter((f) => !f.properties.isImpacted),
        }}
      >
        {/* Glow layer */}
        <Layer
          id="routes-normal-glow"
          type="line"
          paint={{
            'line-width': 8,
            'line-color': '#22d3ee',
            'line-opacity': 0.15,
            'line-blur': 3,
          }}
        />
        {/* Main line */}
        <Layer
          id="routes-normal"
          type="line"
          paint={{
            'line-width': 2.5,
            'line-color': '#22d3ee',
            'line-opacity': 0.8,
            'line-dasharray': [2, 2],
          }}
        />
      </Source>

      {/* Impacted Routes */}
      <Source
        id="routes-impacted"
        type="geojson"
        data={{
          type: 'FeatureCollection',
          features: routesGeoJSON.features.filter((f) => f.properties.isImpacted),
        }}
      >
        {/* Outer glow */}
        <Layer
          id="routes-impacted-outer-glow"
          type="line"
          paint={{
            'line-width': 16,
            'line-color': '#ef4444',
            'line-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.2, 5, 0.4],
            'line-blur': 6,
          }}
        />
        {/* Inner glow */}
        <Layer
          id="routes-impacted-glow"
          type="line"
          paint={{
            'line-width': 8,
            'line-color': '#f97316',
            'line-opacity': 0.5,
            'line-blur': 2,
          }}
        />
        {/* Core line */}
        <Layer
          id="routes-impacted"
          type="line"
          paint={{
            'line-width': 3,
            'line-color': '#ef4444',
            'line-opacity': 1,
          }}
        />
      </Source>

      {/* Selected Route Highlight */}
      {selectedRoute && (
        <Source
          id="route-selected"
          type="geojson"
          data={{
            type: 'FeatureCollection',
            features: routesGeoJSON.features.filter((f) => f.properties.id === selectedRoute),
          }}
        >
          <Layer
            id="route-selected-glow"
            type="line"
            paint={{
              'line-width': 12,
              'line-color': '#22d3ee',
              'line-opacity': 0.6,
              'line-blur': 4,
            }}
          />
        </Source>
      )}

      {/* Node Markers */}
      {supplyNodes.map((node) => (
        <Marker
          key={node.id}
          longitude={node.location.lng}
          latitude={node.location.lat}
          anchor="center"
        >
          <NodeMarker
            node={node}
            isImpacted={impactedSuppliers.includes(node.id)}
            onClick={() => handleNodeClick(node)}
          />
        </Marker>
      ))}

      {/* Popup */}
      {popupInfo && (
        <Popup
          longitude={'location' in popupInfo ? popupInfo.location.lng : popupInfo.center.lng}
          latitude={'location' in popupInfo ? popupInfo.location.lat : popupInfo.center.lat}
          onClose={() => setPopupInfo(null)}
          closeButton={true}
          closeOnClick={false}
          anchor="bottom"
        >
          <div className="p-3 min-w-[200px]">
            {'location' in popupInfo ? (
              // Supply Node popup
              <>
                <h3 className="text-cyan-400 font-mono text-sm font-bold mb-1">
                  {popupInfo.name}
                </h3>
                <p className="text-slate-400 text-xs mb-2">{popupInfo.country}</p>
                {popupInfo.metadata.company && (
                  <p className="text-white text-xs mb-1">
                    <span className="text-slate-500">Company:</span> {popupInfo.metadata.company}
                  </p>
                )}
                {popupInfo.metadata.products && (
                  <p className="text-white text-xs mb-2">
                    <span className="text-slate-500">Products:</span> {popupInfo.metadata.products.join(', ')}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Risk Score</span>
                  <span className={`font-bold ${popupInfo.riskScore > 70 ? 'text-red-400' : popupInfo.riskScore > 40 ? 'text-amber-400' : 'text-green-400'}`}>
                    {popupInfo.riskScore}%
                  </span>
                </div>
              </>
            ) : (
              // Risk Zone popup
              <>
                <h3 className="text-red-400 font-mono text-sm font-bold mb-1">
                  {popupInfo.name}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-red-400/20 text-red-400 border border-red-400/30">
                  {popupInfo.type.replace('_', ' ').toUpperCase()}
                </span>
                <p className="text-slate-300 text-xs mt-2 mb-2">{popupInfo.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Severity</span>
                  <span className="font-bold text-red-400">{popupInfo.severity}%</span>
                </div>
              </>
            )}
          </div>
        </Popup>
      )}
    </Map>
  );
}
