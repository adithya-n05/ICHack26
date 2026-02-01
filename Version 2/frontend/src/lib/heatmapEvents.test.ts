import { describe, expect, it } from 'vitest';
import { buildWarZoneEvent, pickNearestWarZone } from './heatmapEvents';

describe('pickNearestWarZone', () => {
  it('returns the closest war zone point by distance', () => {
    const zones = [
      {
        id: 'zone-a',
        title: 'Zone A',
        location: { lat: 10, lng: 10 },
        severity: 7,
      },
      {
        id: 'zone-b',
        title: 'Zone B',
        location: { lat: 12, lng: 12 },
        severity: 8,
      },
    ];

    const nearest = pickNearestWarZone({ lat: 11.9, lng: 12.1 }, zones);

    expect(nearest?.id).toBe('zone-b');
  });
});

describe('buildWarZoneEvent', () => {
  it('maps war zone metadata into an event payload', () => {
    const event = buildWarZoneEvent({
      id: 'zone-a',
      title: 'Zone A',
      location: { lat: 10, lng: 10 },
      severity: 7,
      startDate: '2025-01-01T00:00:00Z',
      lastEventDate: '2025-02-01T00:00:00Z',
      description: 'Escalation alert',
      source: 'Manual',
    });

    expect(event.type).toBe('war');
    expect(event.startDate).toBe('2025-01-01T00:00:00Z');
    expect(event.endDate).toBe('2025-02-01T00:00:00Z');
    expect(event.title).toBe('Zone A');
  });
});
