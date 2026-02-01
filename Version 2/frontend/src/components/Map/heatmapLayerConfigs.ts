import mapboxgl from 'mapbox-gl';

export type HeatmapLayerConfig = {
  id: string;
  sourceId: string;
  label: string;
  types: string[];
  includeCustomWar: boolean;
  recentWindow: 'default' | 'natural';
  maxzoom: number;
  paint: mapboxgl.HeatmapPaint;
};

export const HEATMAP_LAYER_CONFIGS: HeatmapLayerConfig[] = [
  {
    id: 'events-heat-war',
    sourceId: 'events-heatmap-war',
    label: 'War Heatmap',
    types: ['war'],
    includeCustomWar: true,
    recentWindow: 'default',
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
  {
    id: 'events-heat-natural',
    sourceId: 'events-heatmap-natural',
    label: 'Natural Events Heatmap',
    types: ['natural_disaster', 'weather'],
    includeCustomWar: false,
    recentWindow: 'natural',
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
  {
    id: 'events-heat-tariff',
    sourceId: 'events-heatmap-tariff',
    label: 'Tariff Heatmap',
    types: ['tariff'],
    includeCustomWar: false,
    recentWindow: 'default',
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
        0, 0.65,
        6, 2.1,
        10, 3.8,
      ],
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(255, 165, 90, 0)',
        0.25, 'rgba(255, 165, 90, 0.35)',
        0.5, 'rgba(255, 140, 40, 0.55)',
        0.75, 'rgba(230, 110, 20, 0.75)',
        1, 'rgba(200, 80, 0, 0.9)',
      ],
      'heatmap-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 14,
        6, 52,
        10, 115,
      ],
      'heatmap-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        2, 0.82,
        10, 0.98,
        12, 0.6,
      ],
    },
  },
];
