import { describe, expect, test } from 'vitest';

import { buildHeatmapPopupHtml } from './heatmapPopup';

describe('buildHeatmapPopupHtml', () => {
  test('omits average magnitude from heatmap popup', () => {
    const html = buildHeatmapPopupHtml({
      label: 'Tariff Heatmap',
      radiusKm: 500,
      count: 12,
      topTypesText: 'Tariff: 12',
      dateText: '2026-01-01 → 2026-01-20',
      locationText: '35.0, 120.0',
    });

    expect(html).toContain('Tariff Heatmap');
    expect(html).not.toContain('Avg magnitude');
  });
});
