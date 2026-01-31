import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ScatterplotLayer, ArcLayer, PolygonLayer } from '@deck.gl/layers';
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

const SAMPLE_CONNECTIONS = [
  {
    source: [120.9969, 24.7866] as [number, number], // TSMC
    target: [127.1836, 37.2326] as [number, number], // Samsung
    status: 'healthy',
  },
  {
    source: [120.9969, 24.7866] as [number, number], // TSMC
    target: [-111.8413, 33.3062] as [number, number], // Intel
    status: 'healthy',
  },
  {
    source: [5.4645, 51.4101] as [number, number], // ASML
    target: [120.9969, 24.7866] as [number, number], // TSMC
    status: 'healthy',
  },
];

type ConnectionData = (typeof SAMPLE_CONNECTIONS)[0];

const SAMPLE_EVENTS = [
  {
    contour: [
      [119, 23],
      [122, 23],
      [122, 26],
      [119, 26],
      [119, 23],
    ] as [number, number][],
    type: 'war',
    name: 'Taiwan Strait Tensions',
  },
  {
    contour: [
      [139, 35],
      [142, 35],
      [142, 38],
      [139, 38],
      [139, 35],
    ] as [number, number][],
    type: 'natural_disaster',
    name: 'Japan Earthquake Zone',
  },
];

type EventData = (typeof SAMPLE_EVENTS)[0];

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
      new ArcLayer<ConnectionData>({
        id: 'arcs',
        data: SAMPLE_CONNECTIONS,
        getSourcePosition: (d) => d.source,
        getTargetPosition: (d) => d.target,
        getSourceColor: [224, 224, 224, 200],
        getTargetColor: [224, 224, 224, 200],
        getWidth: 2,
        widthMinPixels: 2,
        getHeight: 0.5,
      }),
      new PolygonLayer<EventData>({
        id: 'heatmaps',
        data: SAMPLE_EVENTS,
        getPolygon: (d) => d.contour,
        getFillColor: [255, 0, 0, 150],
        getLineColor: [255, 255, 255, 50],
        getLineWidth: 1,
        opacity: 0.6,
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
