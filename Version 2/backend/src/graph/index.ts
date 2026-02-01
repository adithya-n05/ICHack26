// backend/src/graph/index.ts
// Graph module exports

export { initNeo4j, closeNeo4j, runQuery, runWrite, getDriver } from '../lib/neo4j';
export { initializeSchema } from './schema';
export type { CompanyNode, PortNode, RouteNode, CountryNode, EventNode } from './schema';
export { 
  fullSync, 
  syncCompanies, 
  syncConnections, 
  syncEvents, 
  syncCountries 
} from './sync';
export {
  getAffectedRoutes,
  getCompanyExposure,
  findAlternativeRoutes,
  getPortCentrality,
  getSupplyChainTree,
  getGraphStats,
  getRouteEvents,
} from './queries';
