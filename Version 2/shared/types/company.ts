import type { GeoPoint } from './geo';

export type CompanyType =
  | 'foundry'
  | 'idm'
  | 'fabless'
  | 'equipment'
  | 'materials'
  | 'ems'
  | 'port'
  | 'airport'
  | 'distribution';

export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  location: GeoPoint;
  city: string;
  country: string;
  industry: string;
  products?: string[];
}
