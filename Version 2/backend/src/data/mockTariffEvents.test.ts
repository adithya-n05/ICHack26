import { describe, expect, test } from 'vitest';

import { buildMockTariffEvents } from './mockTariffEvents';

describe('buildMockTariffEvents', () => {
  test('returns tariff events with valid locations and severity', () => {
    const events = buildMockTariffEvents();

    expect(events.length).toBeGreaterThanOrEqual(10);

    events.forEach((event) => {
      expect(event.id).toBeTruthy();
      expect(event.title).toBeTruthy();
      expect(event.type).toBe('tariff');
      expect(event.description).toContain('Levied by');
      expect(event.description).toContain('Target');
      expect(event.source).toBeTruthy();
      expect(typeof event.lat).toBe('number');
      expect(typeof event.lng).toBe('number');
      expect(event.lat).toBeGreaterThanOrEqual(-90);
      expect(event.lat).toBeLessThanOrEqual(90);
      expect(event.lng).toBeGreaterThanOrEqual(-180);
      expect(event.lng).toBeLessThanOrEqual(180);
      expect(event.severity).toBeGreaterThanOrEqual(1);
      expect(event.severity).toBeLessThanOrEqual(10);
      expect(event.country).toBeTruthy();
    });
  });
});
