import { useEffect, useRef, useMemo, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { TripsLayer } from '@deck.gl/geo-layers';
import { useStore } from '../../store';
import type { SupplyRoute, RiskZone, AlternativeSupplier, SupplyNode, TariffBarrier, Vessel } from '../../types';

// Mapbox token
mapboxgl.accessToken = 'pk.eyJ1IjoiYWRpdGh5YW4wNSIsImEiOiJjbWwxZWFtNnowNjI3M2tzYTVmbG9keWN5In0.M686z8SrmhccrUVl343F1w';

// Risk type to color mapping - STRONG and DISTINCT colors
const RISK_COLORS: Record<string, [number, number, number]> = {
  war: [239, 68, 68],       // #ef4444 - Red
  earthquake: [249, 115, 22], // #f97316 - Orange
  storm: [6, 182, 212],     // #06b6d4 - Cyan
  political: [168, 85, 247], // #a855f7 - Purple
  tariff: [234, 179, 8],    // #eab308 - Amber
};

// Route status to color mapping
const ROUTE_COLORS: Record<string, [number, number, number]> = {
  healthy: [34, 197, 94],    // #22c55e - Green
  'at-risk': [245, 158, 11], // #f59e0b - Amber
  disrupted: [239, 68, 68],  // #ef4444 - Red
};

// Node type to color mapping
const NODE_COLORS: Record<string, [number, number, number]> = {
  supplier: [99, 102, 241],   // #6366f1 - Indigo
  port: [168, 85, 247],       // #a855f7 - Purple
  warehouse: [245, 158, 11],  // #f59e0b - Amber
  factory: [236, 72, 153],    // #ec4899 - Pink
};

export function Globe() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const deckOverlay = useRef<MapboxOverlay | null>(null);
  const animationFrame = useRef<number>(0);

  // Animation state for pulsing effects
  const [animationTime, setAnimationTime] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  const {
    nodes,
    routes,
    riskZones,
    alternatives,
    tariffBarriers,
    vessels,
    showAlternatives,
    simulatedRoutes,
    simulationActive,
    selectedNodeId,
    selectedRouteId,
    selectNode,
    selectRoute,
    setCurrentTime,
  } = useStore();

  // Animation loop for pulsing effects and vessel movement
  useEffect(() => {
    let lastTime = 0;
    const animate = (time: number) => {
      if (time - lastTime > 50) { // ~20fps for animations
        setAnimationTime(t => (t + 1) % 1000);
        setCurrentTime(time);
        lastTime = time;
      }
      animationFrame.current = requestAnimationFrame(animate);
    };
    animationFrame.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame.current);
  }, [setCurrentTime]);

  // Memoize route data by status for efficient updates
  const routesByStatus = useMemo(() => {
    const grouped = {
      healthy: routes.filter(r => r.status === 'healthy'),
      'at-risk': routes.filter(r => r.status === 'at-risk'),
      disrupted: routes.filter(r => r.status === 'disrupted'),
    };
    return grouped;
  }, [routes]);

  // Memoize nodes by type
  const nodesByType = useMemo(() => {
    return {
      supplier: nodes.filter(n => n.type === 'supplier'),
      port: nodes.filter(n => n.type === 'port'),
      warehouse: nodes.filter(n => n.type === 'warehouse'),
      factory: nodes.filter(n => n.type === 'factory'),
    };
  }, [nodes]);

  // Calculate pulse intensity based on animation time
  const getPulseIntensity = (status: string): number => {
    const baseIntensity = status === 'disrupted' ? 0.5 : status === 'at-risk' ? 0.3 : 0.1;
    const pulseSpeed = status === 'disrupted' ? 8 : status === 'at-risk' ? 4 : 2;
    return baseIntensity * (0.5 + 0.5 * Math.sin(animationTime * pulseSpeed * 0.01));
  };

  // Create all Deck.gl layers
  const layers = useMemo(() => {
    const allLayers: any[] = [];

    // ===== 1. RISK HEATMAP LAYERS (by type for distinct colors) =====
    Object.entries(RISK_COLORS).forEach(([riskType, color]) => {
      const typeData = riskZones.filter(z => z.type === riskType);
      if (typeData.length > 0) {
        allLayers.push(
          new HeatmapLayer({
            id: `risk-heatmap-${riskType}`,
            data: typeData,
            getPosition: (d: RiskZone) => d.coordinates,
            getWeight: (d: RiskZone) => d.intensity,
            radiusPixels: 120,
            intensity: 1.2,
            threshold: 0.03,
            colorRange: [
              [color[0], color[1], color[2], 0],
              [color[0], color[1], color[2], 80],
              [color[0], color[1], color[2], 140],
              [color[0], color[1], color[2], 200],
              [color[0], color[1], color[2], 255],
            ],
          })
        );
      }
    });

    // ===== 2. TARIFF BARRIER ARCS =====
    if (tariffBarriers.length > 0) {
      // Glow layer
      allLayers.push(
        new ArcLayer({
          id: 'tariff-barriers-glow',
          data: tariffBarriers,
          getSourcePosition: (d: TariffBarrier) => d.sourceCoordinates,
          getTargetPosition: (d: TariffBarrier) => d.targetCoordinates,
          getSourceColor: [234, 179, 8, 40],
          getTargetColor: [234, 179, 8, 40],
          getWidth: 8,
          greatCircle: true,
        })
      );
      // Main layer with dashed effect
      allLayers.push(
        new ArcLayer({
          id: 'tariff-barriers',
          data: tariffBarriers,
          getSourcePosition: (d: TariffBarrier) => d.sourceCoordinates,
          getTargetPosition: (d: TariffBarrier) => d.targetCoordinates,
          getSourceColor: [234, 179, 8, 180],
          getTargetColor: [234, 179, 8, 180],
          getWidth: 2,
          greatCircle: true,
          pickable: true,
        })
      );
    }

    // ===== 3. SUPPLY CHAIN ARCS (by status with glow effects) =====
    Object.entries(routesByStatus).forEach(([status, statusRoutes]) => {
      if (statusRoutes.length === 0) return;

      const color = ROUTE_COLORS[status];
      const pulseIntensity = getPulseIntensity(status);
      const glowAlpha = Math.floor(40 + pulseIntensity * 60);

      // Glow layer (wider, more transparent)
      allLayers.push(
        new ArcLayer({
          id: `routes-glow-${status}`,
          data: statusRoutes,
          getSourcePosition: (d: SupplyRoute) => d.coordinates[0],
          getTargetPosition: (d: SupplyRoute) => d.coordinates[d.coordinates.length - 1],
          getSourceColor: [...color, glowAlpha],
          getTargetColor: [...color, glowAlpha],
          getWidth: status === 'disrupted' ? 16 : status === 'at-risk' ? 14 : 10,
          greatCircle: true,
          updateTriggers: {
            getSourceColor: animationTime,
            getTargetColor: animationTime,
          },
        })
      );

      // Main arc layer
      allLayers.push(
        new ArcLayer({
          id: `routes-${status}`,
          data: statusRoutes,
          getSourcePosition: (d: SupplyRoute) => d.coordinates[0],
          getTargetPosition: (d: SupplyRoute) => d.coordinates[d.coordinates.length - 1],
          getSourceColor: [...color, 220],
          getTargetColor: [...color, 220],
          getWidth: (d: SupplyRoute) => d.id === selectedRouteId ? 5 : 3,
          greatCircle: true,
          pickable: true,
          onClick: (info: any) => {
            if (info.object) {
              selectRoute(info.object.id);
            }
          },
          updateTriggers: {
            getWidth: selectedRouteId,
          },
        })
      );
    });

    // ===== 4. SIMULATED REROUTE ARCS (green dashed) =====
    if (simulationActive && simulatedRoutes.length > 0) {
      // Glow
      allLayers.push(
        new ArcLayer({
          id: 'simulated-routes-glow',
          data: simulatedRoutes,
          getSourcePosition: (d: SupplyRoute) => d.coordinates[0],
          getTargetPosition: (d: SupplyRoute) => d.coordinates[d.coordinates.length - 1],
          getSourceColor: [34, 197, 94, 60],
          getTargetColor: [34, 197, 94, 60],
          getWidth: 12,
          greatCircle: true,
        })
      );
      // Main with pulsing
      allLayers.push(
        new ArcLayer({
          id: 'simulated-routes',
          data: simulatedRoutes,
          getSourcePosition: (d: SupplyRoute) => d.coordinates[0],
          getTargetPosition: (d: SupplyRoute) => d.coordinates[d.coordinates.length - 1],
          getSourceColor: [34, 197, 94, 200],
          getTargetColor: [34, 197, 94, 200],
          getWidth: 3,
          greatCircle: true,
        })
      );
    }

    // ===== 5. VESSEL TRAFFIC (TripsLayer for animated ships) =====
    if (vessels.length > 0) {
      const tripsData = vessels.filter(v => v.path && v.timestamps).map(v => ({
        path: v.path,
        timestamps: v.timestamps,
        vessel: v,
      }));

      if (tripsData.length > 0) {
        allLayers.push(
          new TripsLayer({
            id: 'vessel-traffic',
            data: tripsData,
            getPath: (d: any) => d.path,
            getTimestamps: (d: any) => d.timestamps,
            getColor: [6, 182, 212, 200], // Cyan for vessels
            widthMinPixels: 3,
            fadeTrail: true,
            trailLength: 1000,
            currentTime: animationTime * 5,
            updateTriggers: {
              currentTime: animationTime,
            },
          })
        );
      }

      // Current vessel positions
      allLayers.push(
        new ScatterplotLayer({
          id: 'vessel-positions',
          data: vessels,
          getPosition: (d: Vessel) => d.coordinates,
          getFillColor: [6, 182, 212, 255],
          getRadius: 30000,
          radiusMinPixels: 4,
          radiusMaxPixels: 10,
          pickable: true,
        })
      );
    }

    // ===== 6. INFRASTRUCTURE NODES (by type) =====
    Object.entries(nodesByType).forEach(([nodeType, typeNodes]) => {
      if (typeNodes.length === 0) return;

      const baseColor = NODE_COLORS[nodeType as keyof typeof NODE_COLORS];

      // Glow for at-risk nodes
      const atRiskNodes = typeNodes.filter(n => n.riskScore > 60);
      if (atRiskNodes.length > 0) {
        allLayers.push(
          new ScatterplotLayer({
            id: `nodes-glow-${nodeType}`,
            data: atRiskNodes,
            getPosition: (d: SupplyNode) => d.coordinates,
            getFillColor: [245, 158, 11, Math.floor(60 + getPulseIntensity('at-risk') * 80)],
            getRadius: 80000,
            radiusMinPixels: 12,
            radiusMaxPixels: 30,
            updateTriggers: {
              getFillColor: animationTime,
            },
          })
        );
      }

      // Main nodes
      allLayers.push(
        new ScatterplotLayer({
          id: `nodes-${nodeType}`,
          data: typeNodes,
          getPosition: (d: SupplyNode) => d.coordinates,
          getFillColor: (d: SupplyNode) => {
            if (d.riskScore > 70) return [239, 68, 68, 255]; // Critical
            if (d.riskScore > 60) return [245, 158, 11, 255]; // At-risk
            return [...baseColor, 220];
          },
          getLineColor: (d: SupplyNode) => {
            if (d.id === selectedNodeId) return [255, 255, 255, 255];
            return [200, 200, 200, 150];
          },
          getRadius: (d: SupplyNode) => {
            if (d.id === selectedNodeId) return 60000;
            return d.riskScore > 60 ? 50000 : 40000;
          },
          radiusMinPixels: 6,
          radiusMaxPixels: 22,
          lineWidthMinPixels: 2,
          stroked: true,
          filled: true,
          pickable: true,
          onClick: (info: any) => {
            if (info.object) {
              selectNode(info.object.id);
            }
          },
          updateTriggers: {
            getRadius: selectedNodeId,
            getLineColor: selectedNodeId,
            getFillColor: animationTime,
          },
        })
      );
    });

    // ===== 7. ALTERNATIVE SUPPLIERS (green glowing markers) =====
    if (showAlternatives && alternatives.length > 0) {
      // Large pulsing glow
      allLayers.push(
        new ScatterplotLayer({
          id: 'alternatives-outer-glow',
          data: alternatives,
          getPosition: (d: AlternativeSupplier) => d.coordinates,
          getFillColor: [34, 197, 94, Math.floor(40 + Math.sin(animationTime * 0.05) * 30)],
          getRadius: 100000,
          radiusMinPixels: 20,
          radiusMaxPixels: 50,
          updateTriggers: {
            getFillColor: animationTime,
          },
        })
      );

      // Inner glow
      allLayers.push(
        new ScatterplotLayer({
          id: 'alternatives-glow',
          data: alternatives,
          getPosition: (d: AlternativeSupplier) => d.coordinates,
          getFillColor: [34, 197, 94, 100],
          getRadius: 70000,
          radiusMinPixels: 14,
          radiusMaxPixels: 35,
        })
      );

      // Main markers
      allLayers.push(
        new ScatterplotLayer({
          id: 'alternatives',
          data: alternatives,
          getPosition: (d: AlternativeSupplier) => d.coordinates,
          getFillColor: [34, 197, 94, 255],
          getLineColor: [34, 197, 94, 255],
          getRadius: 50000,
          radiusMinPixels: 10,
          radiusMaxPixels: 28,
          lineWidthMinPixels: 2,
          stroked: true,
          filled: true,
          pickable: true,
          onClick: (info: any) => {
            if (info.object) {
              console.log('Selected alternative:', info.object);
              // TODO: Show reroute arc and update panel
            }
          },
        })
      );
    }

    return allLayers;
  }, [
    riskZones,
    routesByStatus,
    nodesByType,
    tariffBarriers,
    vessels,
    alternatives,
    showAlternatives,
    simulatedRoutes,
    simulationActive,
    selectedNodeId,
    selectedRouteId,
    animationTime,
    selectNode,
    selectRoute,
  ]);

  // Initialize map (only once)
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [105, 20],
      zoom: 2.5,
      projection: 'globe',
      antialias: true,
    });

    map.current.on('style.load', () => {
      // Add atmosphere and stars with optimized settings
      map.current!.setFog({
        color: 'rgb(12, 12, 14)',
        'high-color': 'rgb(22, 22, 28)',
        'horizon-blend': 0.04,
        'space-color': 'rgb(8, 8, 12)',
        'star-intensity': 0.6,
      });

      // Initialize Deck.gl overlay with empty layers - they'll be set by the other useEffect
      deckOverlay.current = new MapboxOverlay({
        interleaved: true,
        layers: [],
      });
      map.current!.addControl(deckOverlay.current as any);
      setMapReady(true);
    });

    // Handle map click on empty space to deselect
    map.current.on('click', (e) => {
      // Only deselect if clicking on empty space (no deck.gl layer picked)
      setTimeout(() => {
        const picked = deckOverlay.current?.pickObject({
          x: e.point.x,
          y: e.point.y,
          radius: 10,
        });
        if (!picked) {
          selectNode(null);
          selectRoute(null);
        }
      }, 10);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [selectNode, selectRoute]);

  // Update layers when data changes or map becomes ready
  useEffect(() => {
    if (mapReady && deckOverlay.current) {
      deckOverlay.current.setProps({ layers });
    }
  }, [layers, mapReady]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Simulation Active Badge */}
      {simulationActive && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.3)] rounded-lg flex items-center gap-2 z-20">
          <span className="w-2 h-2 rounded-full bg-[var(--healthy)] animate-pulse" />
          <span className="text-[var(--healthy)] text-xs font-mono font-medium uppercase tracking-wide">
            Simulation Active
          </span>
        </div>
      )}
    </div>
  );
}
