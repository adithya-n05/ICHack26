import { GeoPoint } from './geo';
import { Supplier } from './supplier';
import { Material } from './material';
import { Connection } from './connection';

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
