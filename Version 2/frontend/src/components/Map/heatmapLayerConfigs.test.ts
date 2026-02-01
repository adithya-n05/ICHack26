import { describe, expect, it } from 'vitest';

import { HEATMAP_LAYER_CONFIGS } from './heatmapLayerConfigs';

describe('HEATMAP_LAYER_CONFIGS', () => {
  it('includes a tariff heatmap layer with orange color', () => {
    const tariffConfig = HEATMAP_LAYER_CONFIGS.find((config) => config.id === 'events-heat-tariff');

    expect(tariffConfig).toBeTruthy();
    expect(tariffConfig?.sourceId).toBe('events-heatmap-tariff');
    expect(tariffConfig?.types).toContain('tariff');

    const heatmapColor = (tariffConfig?.paint as { ['heatmap-color']?: unknown })?.['heatmap-color'];
    expect(Array.isArray(heatmapColor)).toBe(true);
    expect(JSON.stringify(heatmapColor)).toContain('rgba(255');
  });
});
