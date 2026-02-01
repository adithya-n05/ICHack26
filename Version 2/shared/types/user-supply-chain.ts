import type { GeoPoint } from './geo';
import type { Supplier } from './supplier';
import type { Material } from './material';
import type { Connection } from './connection';

export interface UserCompany {
  name: string;
  location: GeoPoint;
  role: 'designer' | 'manufacturer' | 'assembler' | 'distributor';
}

export interface UserSupplyChain {
  id?: string;
  company: UserCompany;
  suppliers: Supplier[];
  materials: Material[];
  connections: Connection[];
  createdAt?: string;
  updatedAt?: string;
}
