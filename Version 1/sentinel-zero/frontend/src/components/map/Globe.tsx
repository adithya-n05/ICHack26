/**
 * Globe.tsx - Main Mapbox + Deck.gl visualization
 *
 * Fixed using Context7 Deck.gl best practices:
 * - Use map.once('load') to ensure map is fully ready
 * - Create MapboxOverlay with layers immediately
 * - Update via setProps when data changes
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { TripsLayer } from '@deck.gl/geo-layers';
import { useStore } from '../../store';
import type { SupplyRoute, RiskZone, AlternativeSupplier, SupplyNode, TariffBarrier, Vessel } from '../../types';

// Mapbox token
mapboxgl.accessToken = 'pk.eyJ1IjoiYWRpdGh5YW4wNSIsImEiOiJjbWwxZWFtNnowNjI3M2tzYTVmbG9keWN5In0.M686z8SrmhccrUVl343F1w';

// Risk type to color mapping
const RISK_COLORS: Record<string, [number, number, number]> = {
  war: [239, 68, 68],       // Red
  earthquake: [249, 115, 22], // Orange
  storm: [6, 182, 212],     // Cyan
  political: [168, 85, 247], // Purple
  tariff: [234, 179, 8],    // Amber
};

// Route status to color mapping
const ROUTE_COLORS: Record<string, [number, number, number]> = {
  healthy: [34, 197, 94],    // Green
  'at-risk': [245, 158, 11], // Amber
  disrupted: [239, 68, 68],  // Red
};

// Node type to color mapping
const NODE_COLORS: Record<string, [number, number, number]> = {
  supplier: [99, 102, 241],   // Indigo
  port: [168, 85, 247],       // Purple
  warehouse: [245, 158, 11],  // Amber
  factory: [236, 72, 153],    // Pink
};

export function Globe() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const deckOverlayRef = useRef<MapboxOverlay | null>(null);
  const animationFrameRef = useRef<number>(0);

  const [animationTime, setAnimationTime] = useState(0);

  // Get data from store
  const nodes = useStore((s) => s.nodes);
  const routes = useStore((s) => s.routes);
  const riskZones = useStore((s) => s.riskZones);
  const alternatives = useStore((s) => s.alternatives);
  const tariffBarriers = useStore((s) => s.tariffBarriers);
  const vessels = useStore((s) => s.vessels);
  const showAlternatives = useStore((s) => s.showAlternatives);
  const simulatedRoutes = useStore((s) => s.simulatedRoutes);
  const simulationActive = useStore((s) => s.simulationActive);
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const selectedRouteId = useStore((s) => s.selectedRouteId);
  const selectNode = useStore((s) => s.selectNode);
  const selectRoute = useStore((s) => s.selectRoute);
  const setCurrentTime = useStore((s) => s.setCurrentTime);

  // Layer creation function - called both on init and updates
  const createLayers = useCallback((time: number) => {
    const allLayers: any[] = [];

    // Helper for pulse effect
    const getPulseIntensity = (status: string): number => {
      const baseIntensity = status === 'disrupted' ? 0.5 : status === 'at-risk' ? 0.3 : 0.1;
      const pulseSpeed = status === 'disrupted' ? 8 : status === 'at-risk' ? 4 : 2;
      return baseIntensity * (0.5 + 0.5 * Math.sin(time * pulseSpeed * 0.01));
    };

    // 1. RISK HEATMAPS (by type for distinct colors)
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

    // 2. TARIFF BARRIERS
    if (tariffBarriers.length > 0) {
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
        }),
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

    // 3. SUPPLY CHAIN ARCS (grouped by status)
    const routesByStatus = {
      healthy: routes.filter(r => r.status === 'healthy'),
      'at-risk': routes.filter(r => r.status === 'at-risk'),
      disrupted: routes.filter(r => r.status === 'disrupted'),
    };

    Object.entries(routesByStatus).forEach(([status, statusRoutes]) => {
      if (statusRoutes.length === 0) return;

      const color = ROUTE_COLORS[status];
      const pulseIntensity = getPulseIntensity(status);
      const glowAlpha = Math.floor(40 + pulseIntensity * 60);

      // Glow layer
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
        })
      );

      // Main arc
      allLayers.push(
        new ArcLayer({
          id: `routes-${status}`,
          data: statusRoutes,
          getSourcePosition: (d: SupplyRoute) => d.coordinates[0],
          getTargetPosition: (d: SupplyRoute) => d.coordinates[d.coordinates.length - 1],
          getSourceColor: [...color, 220],
          getTargetColor: [...color, 220],
          getWidth: 3,
          greatCircle: true,
          pickable: true,
          onClick: (info: { object?: SupplyRoute }) => {
            if (info.object) selectRoute(info.object.id);
          },
        })
      );
    });

    // 4. SIMULATED ROUTES (if simulation active)
    if (simulationActive && simulatedRoutes.length > 0) {
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
        }),
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

    // 5. VESSEL TRAFFIC
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
            getPath: (d: { path: [number, number][] }) => d.path,
            getTimestamps: (d: { timestamps: number[] }) => d.timestamps,
            getColor: [6, 182, 212, 200],
            widthMinPixels: 3,
            fadeTrail: true,
            trailLength: 1000,
            currentTime: time * 5,
          })
        );
      }

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

    // 6. INFRASTRUCTURE NODES
    const nodesByType = {
      supplier: nodes.filter(n => n.type === 'supplier'),
      port: nodes.filter(n => n.type === 'port'),
      warehouse: nodes.filter(n => n.type === 'warehouse'),
      factory: nodes.filter(n => n.type === 'factory'),
    };

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
            if (d.riskScore > 70) return [239, 68, 68, 255];
            if (d.riskScore > 60) return [245, 158, 11, 255];
            return [...baseColor, 220] as [number, number, number, number];
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
          onClick: (info: { object?: SupplyNode }) => {
            if (info.object) selectNode(info.object.id);
          },
        })
      );
    });

    // 7. ALTERNATIVE SUPPLIERS (green markers)
    if (showAlternatives && alternatives.length > 0) {
      allLayers.push(
        new ScatterplotLayer({
          id: 'alternatives-outer-glow',
          data: alternatives,
          getPosition: (d: AlternativeSupplier) => d.coordinates,
          getFillColor: [34, 197, 94, Math.floor(40 + Math.sin(time * 0.05) * 30)],
          getRadius: 100000,
          radiusMinPixels: 20,
          radiusMaxPixels: 50,
        }),
        new ScatterplotLayer({
          id: 'alternatives-glow',
          data: alternatives,
          getPosition: (d: AlternativeSupplier) => d.coordinates,
          getFillColor: [34, 197, 94, 100],
          getRadius: 70000,
          radiusMinPixels: 14,
          radiusMaxPixels: 35,
        }),
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
        })
      );
    }

    return allLayers;
  }, [
    nodes, routes, riskZones, alternatives, tariffBarriers, vessels,
    showAlternatives, simulatedRoutes, simulationActive,
    selectedNodeId, selectedRouteId, selectNode, selectRoute
  ]);

  // Initialize map ONCE
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    console.log('[Globe] Initializing Mapbox map...');

    const newMap = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [105, 20],
      zoom: 2.5,
      projection: 'globe',
      antialias: true,
    });

    mapRef.current = newMap;

    // Use map.once('load') per Context7 best practice
    newMap.once('load', () => {
      console.log('[Globe] Map loaded, initializing Deck.gl overlay...');

      // Set atmosphere
      newMap.setFog({
        color: 'rgb(12, 12, 14)',
        'high-color': 'rgb(22, 22, 28)',
        'horizon-blend': 0.04,
        'space-color': 'rgb(8, 8, 12)',
        'star-intensity': 0.6,
      });

      // Create MapboxOverlay with interleaved: false for better compatibility
      const overlay = new MapboxOverlay({
        interleaved: false, // Use separate canvas for deck.gl
        layers: [],
      });

      newMap.addControl(overlay as unknown as mapboxgl.IControl);
      deckOverlayRef.current = overlay;
      console.log('[Globe] Deck.gl overlay added, waiting for data...');

      // Force initial layer update after overlay is ready
      setTimeout(() => {
        if (deckOverlayRef.current) {
          const state = useStore.getState();
          console.log('[Globe] Initial data - nodes:', state.nodes.length, 'routes:', state.routes.length, 'riskZones:', state.riskZones.length);
        }
      }, 100);
    });

    // Handle click on empty space
    newMap.on('click', (e) => {
      setTimeout(() => {
        const picked = deckOverlayRef.current?.pickObject({
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
      newMap.remove();
      mapRef.current = null;
      deckOverlayRef.current = null;
    };
  }, []); // Empty deps - only run once

  // Animation loop
  useEffect(() => {
    let lastTime = 0;
    const animate = (time: number) => {
      if (time - lastTime > 50) {
        setAnimationTime(t => (t + 1) % 1000);
        setCurrentTime(time);
        lastTime = time;
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [setCurrentTime]);

  // Update layers when data or animation changes
  useEffect(() => {
    if (deckOverlayRef.current) {
      const newLayers = createLayers(animationTime);
      if (animationTime % 100 === 0) {
        console.log('[Globe] Updating layers:', newLayers.length, 'layers, nodes:', nodes.length, 'routes:', routes.length, 'riskZones:', riskZones.length);
      }
      deckOverlayRef.current.setProps({ layers: newLayers });
    }
  }, [createLayers, animationTime, nodes, routes, riskZones]);

  return (
    <div className="relative w-full h-full" data-map-container>
      <div ref={mapContainer} className="w-full h-full" />

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
