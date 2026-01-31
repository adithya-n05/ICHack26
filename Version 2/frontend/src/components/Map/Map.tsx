import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ScatterplotLayer } from '@deck.gl/layers';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const SAMPLE_NODES = [
  { position: [120.9969, 24.7866] as [number, number], name: 'TSMC Hsinchu' },
];

export function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const deckOverlay = useRef<MapboxOverlay | null>(null);

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
      const layers = [
        new ScatterplotLayer({
          id: 'nodes',
          data: SAMPLE_NODES,
          getPosition: (d) => d.position,
          getRadius: 50000,
          getFillColor: [0, 255, 255, 200],
        }),
      ];
      deckOverlay.current = new MapboxOverlay({ layers });
      map.current?.addControl(deckOverlay.current as unknown as mapboxgl.IControl);
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  return <div ref={mapContainer} className="h-screen w-screen" />;
}
