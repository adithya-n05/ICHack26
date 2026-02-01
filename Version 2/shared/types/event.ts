import type { GeoPoint } from './geo';

export type EventType =
  | 'natural_disaster'
  | 'weather'
  | 'war'
  | 'geopolitical'
  | 'tariff'
  | 'infrastructure';

export interface Event {
  id: string;
  type: EventType;
  title: string;
  description: string;
  location: GeoPoint;
  severity: number; // 1-10
  startDate: string;
  endDate?: string;
  source: string;
  polygon?: GeoPoint[];
}
