import type { GeoPoint } from './geo';

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  location: GeoPoint;
  tier: 1 | 2 | 3;
  materials: string[];
}
