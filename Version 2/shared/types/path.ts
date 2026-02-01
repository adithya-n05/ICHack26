import { ProductCategory } from './taxonomy';

export interface SupplyPath {
  id: string;
  companyId: string;
  productCategory: ProductCategory;
  status: 'active' | 'at-risk' | 'disrupted';
}

export interface PathEdge {
  id: string;
  pathId: string;
  fromNodeId: string;
  toNodeId: string;
  sequence: number;
  costScore: number;
  riskScore: number;
  tariffCost: number;
}
