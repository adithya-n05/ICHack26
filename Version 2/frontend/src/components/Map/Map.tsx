import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const SAMPLE_NODES = [
  { position: [120.9969, 24.7866] as [number, number], name: 'TSMC Hsinchu', type: 'foundry' },
  { position: [127.1836, 37.2326] as [number, number], name: 'Samsung Hwaseong', type: 'idm' },
  { position: [121.4737, 31.2304] as [number, number], name: 'SMIC Shanghai', type: 'foundry' },
  { position: [-111.8413, 33.3062] as [number, number], name: 'Intel Chandler', type: 'idm' },
  { position: [5.4645, 51.4101] as [number, number], name: 'ASML Veldhoven', type: 'equipment' },
];

type NodeData = (typeof SAMPLE_NODES)[0];

export function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const deckOverlay = useRef<MapboxOverlay | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null);

  const getLayers = useCallback(() => {
    return [
      new ScatterplotLayer<NodeData>({
        id: 'nodes',
        data: SAMPLE_NODES,
        getPosition: (d) => d.position,
        getRadius: (d) => (hoveredNode?.name === d.name ? 80000 : 50000),
        radiusMinPixels: 6,
        radiusMaxPixels: 25,
        getFillColor: [0, 255, 255, 200],
        stroked: true,
        getLineColor: [0, 255, 255, 255],
        lineWidthMinPixels: 2,
        pickable: true,
        onHover: (info) => setHoveredNode(info.object || null),
        onClick: (info) => {
          if (info.object) {
            console.log('Clicked node:', info.object);
          }
        },
        updateTriggers: {
          getRadius: hoveredNode?.name,
        },
      }),
      new ArcLayer({
        id: 'arcs',
        data: [],
        getSourcePosition: (d: { source: [number, number] }) => d.source,
        getTargetPosition: (d: { target: [number, number] }) => d.target,
        getSourceColor: [224, 224, 224, 200],
        getTargetColor: [224, 224, 224, 200],
        getWidth: 2,
      }),
    ];
  }, [hoveredNode]);

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

  return <div ref={mapContainer} className="h-screen w-screen" />;
}
