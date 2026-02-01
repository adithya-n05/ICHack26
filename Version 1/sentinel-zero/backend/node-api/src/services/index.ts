/**
 * Services Index
 * Exports all data services for the Sentinel-Zero backend
 */

export { USGSService, type RiskZone } from './usgs.js';
export { GDELTService, type NewsItem } from './gdelt.js';
export { NOAAService, type StormRiskZone } from './noaa.js';
export { ReliefWebService, type ConflictRiskZone } from './reliefweb.js';
export { PerplexityService, type IndustryNews } from './perplexity.js';
export { supabaseService } from './supabase.js';
export { dataAggregator, type AggregatedData, type AnyRiskZone } from './dataAggregator.js';
