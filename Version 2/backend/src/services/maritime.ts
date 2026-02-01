// backend/src/services/maritime.ts
// Maritime Data Source Integration
// Integrates AIS data, port congestion, and vessel tracking

import { supabase } from '../lib/supabase';

// ============================================================================
// Types
// ============================================================================

export interface VesselPosition {
  mmsi: string;
  imo?: string;
  name: string;
  shipType: string;
  latitude: number;
  longitude: number;
  course: number;
  speed: number;
  heading: number;
  destination?: string;
  eta?: string;
  timestamp: string;
}

export interface PortCongestion {
  portId: string;
  portName: string;
  unlocode: string;
  congestionLevel: 'low' | 'moderate' | 'high' | 'severe';
  waitingVessels: number;
  avgWaitTimeDays: number;
  containerDwellTime: number;
  berthUtilization: number;
  lastUpdated: string;
}

export interface ShippingRoute {
  routeId: string;
  origin: { portId: string; name: string; unlocode: string };
  destination: { portId: string; name: string; unlocode: string };
  estimatedDays: number;
  currentDelayDays: number;
  riskScore: number;
  activeVessels: number;
  waypoints: Array<{ lat: number; lng: number; name?: string }>;
}

export interface MaritimeAlert {
  id: string;
  type: 'port_closure' | 'congestion' | 'weather' | 'piracy' | 'geopolitical';
  severity: 'info' | 'warning' | 'critical';
  location: { lat: number; lng: number };
  radius: number; // km
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  affectedRoutes: string[];
}

// ============================================================================
// Configuration
// ============================================================================

// MarineTraffic API (requires subscription)
const MARINETRAFFIC_API_KEY = process.env.MARINETRAFFIC_API_KEY;
const MARINETRAFFIC_BASE = 'https://services.marinetraffic.com/api';

// VesselFinder API (alternative)
const VESSELFINDER_API_KEY = process.env.VESSELFINDER_API_KEY;

// UN/LOCODE Database URL
const UNLOCODE_API = 'https://unece.org/trade/cefact/unlocode-code-list-country-and-territory';

// ============================================================================
// Port Data (Static reference data with live congestion estimates)
// ============================================================================

// Major global ports with baseline data
const MAJOR_PORTS: Record<string, {
  name: string;
  unlocode: string;
  country: string;
  lat: number;
  lng: number;
  capacity: number; // TEU per year
  type: 'container' | 'bulk' | 'tanker' | 'mixed';
}> = {
  'port-shanghai': {
    name: 'Port of Shanghai',
    unlocode: 'CNSHA',
    country: 'CN',
    lat: 31.2304,
    lng: 121.4737,
    capacity: 47000000,
    type: 'container',
  },
  'port-singapore': {
    name: 'Port of Singapore',
    unlocode: 'SGSIN',
    country: 'SG',
    lat: 1.2644,
    lng: 103.8222,
    capacity: 37000000,
    type: 'container',
  },
  'port-rotterdam': {
    name: 'Port of Rotterdam',
    unlocode: 'NLRTM',
    country: 'NL',
    lat: 51.9225,
    lng: 4.4792,
    capacity: 15000000,
    type: 'mixed',
  },
  'port-los-angeles': {
    name: 'Port of Los Angeles',
    unlocode: 'USLAX',
    country: 'US',
    lat: 33.7295,
    lng: -118.2625,
    capacity: 10000000,
    type: 'container',
  },
  'port-busan': {
    name: 'Port of Busan',
    unlocode: 'KRPUS',
    country: 'KR',
    lat: 35.1028,
    lng: 129.0326,
    capacity: 22000000,
    type: 'container',
  },
  'port-hong-kong': {
    name: 'Port of Hong Kong',
    unlocode: 'HKHKG',
    country: 'HK',
    lat: 22.2783,
    lng: 114.1747,
    capacity: 18000000,
    type: 'container',
  },
  'port-shenzhen': {
    name: 'Port of Shenzhen',
    unlocode: 'CNSZX',
    country: 'CN',
    lat: 22.5431,
    lng: 114.0579,
    capacity: 27000000,
    type: 'container',
  },
  'port-ningbo': {
    name: 'Port of Ningbo-Zhoushan',
    unlocode: 'CNNGB',
    country: 'CN',
    lat: 29.8683,
    lng: 121.5440,
    capacity: 31000000,
    type: 'container',
  },
  'port-qingdao': {
    name: 'Port of Qingdao',
    unlocode: 'CNTAO',
    country: 'CN',
    lat: 36.0671,
    lng: 120.3826,
    capacity: 23000000,
    type: 'container',
  },
  'port-dubai': {
    name: 'Jebel Ali Port',
    unlocode: 'AEJEA',
    country: 'AE',
    lat: 25.0157,
    lng: 55.0272,
    capacity: 15000000,
    type: 'container',
  },
  'port-antwerp': {
    name: 'Port of Antwerp',
    unlocode: 'BEANR',
    country: 'BE',
    lat: 51.2194,
    lng: 4.4025,
    capacity: 12000000,
    type: 'mixed',
  },
  'port-hamburg': {
    name: 'Port of Hamburg',
    unlocode: 'DEHAM',
    country: 'DE',
    lat: 53.5511,
    lng: 9.9937,
    capacity: 9000000,
    type: 'container',
  },
};

// Major shipping chokepoints
const CHOKEPOINTS: Array<{
  name: string;
  lat: number;
  lng: number;
  baseRisk: number;
  description: string;
}> = [
  { name: 'Strait of Malacca', lat: 1.4, lng: 103.8, baseRisk: 3, description: '30% of global trade' },
  { name: 'Suez Canal', lat: 30.8, lng: 32.3, baseRisk: 4, description: '12% of global trade' },
  { name: 'Panama Canal', lat: 9.1, lng: -79.7, baseRisk: 3, description: '5% of global trade' },
  { name: 'Strait of Hormuz', lat: 26.5, lng: 56.3, baseRisk: 6, description: '20% of global oil' },
  { name: 'Bab el-Mandeb', lat: 12.6, lng: 43.3, baseRisk: 5, description: 'Red Sea access' },
  { name: 'Taiwan Strait', lat: 24.5, lng: 119.5, baseRisk: 7, description: 'Critical semiconductor route' },
  { name: 'Cape of Good Hope', lat: -34.4, lng: 18.5, baseRisk: 2, description: 'Suez alternative' },
];

// ============================================================================
// Port Congestion Estimation
// ============================================================================

/**
 * Estimate port congestion based on various factors
 * In production, this would integrate with real AIS data
 */
export async function estimatePortCongestion(portId: string): Promise<PortCongestion | null> {
  const port = MAJOR_PORTS[portId];
  if (!port) return null;

  // Check for recent events affecting this port
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .or(`location->>'lat'.gte.${port.lat - 2},location->>'lat'.lte.${port.lat + 2}`)
    .gte('occurred_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('severity', { ascending: false })
    .limit(10);

  // Calculate congestion based on events
  let eventImpact = 0;
  if (events) {
    eventImpact = events.reduce((sum, e) => sum + (e.severity || 0), 0) / 10;
  }

  // Seasonal factors (Q4 peak season, Lunar New Year, etc.)
  const month = new Date().getMonth();
  const seasonalFactor = [1.0, 1.2, 1.1, 1.0, 0.9, 0.9, 0.9, 1.0, 1.0, 1.1, 1.2, 1.3][month];

  // Base congestion varies by port
  const baseCongestion: Record<string, number> = {
    'port-los-angeles': 0.4, // Historically congested
    'port-shanghai': 0.3,
    'port-rotterdam': 0.2,
    'port-singapore': 0.2,
  };

  const base = baseCongestion[portId] || 0.25;
  const congestionScore = Math.min(1, base * seasonalFactor + eventImpact * 0.1);

  // Determine congestion level
  let level: PortCongestion['congestionLevel'];
  if (congestionScore >= 0.75) level = 'severe';
  else if (congestionScore >= 0.5) level = 'high';
  else if (congestionScore >= 0.25) level = 'moderate';
  else level = 'low';

  // Estimate wait times based on congestion
  const waitingVessels = Math.round(congestionScore * 50);
  const avgWaitTimeDays = Math.round(congestionScore * 7 * 10) / 10;
  const containerDwellTime = Math.round((3 + congestionScore * 5) * 10) / 10;
  const berthUtilization = Math.round((0.6 + congestionScore * 0.35) * 100);

  return {
    portId,
    portName: port.name,
    unlocode: port.unlocode,
    congestionLevel: level,
    waitingVessels,
    avgWaitTimeDays,
    containerDwellTime,
    berthUtilization,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get congestion for all major ports
 */
export async function getAllPortCongestion(): Promise<PortCongestion[]> {
  const results: PortCongestion[] = [];
  
  for (const portId of Object.keys(MAJOR_PORTS)) {
    const congestion = await estimatePortCongestion(portId);
    if (congestion) {
      results.push(congestion);
    }
  }
  
  return results;
}

// ============================================================================
// Shipping Route Analysis
// ============================================================================

/**
 * Calculate route risk based on chokepoints and current events
 */
export async function calculateRouteRisk(
  originUnlocode: string,
  destUnlocode: string
): Promise<ShippingRoute | null> {
  // Find ports by UNLOCODE
  const originEntry = Object.entries(MAJOR_PORTS).find(([_, p]) => p.unlocode === originUnlocode);
  const destEntry = Object.entries(MAJOR_PORTS).find(([_, p]) => p.unlocode === destUnlocode);
  
  if (!originEntry || !destEntry) return null;
  
  const [originId, origin] = originEntry;
  const [destId, dest] = destEntry;

  // Determine which chokepoints the route passes through
  const affectedChokepoints = getRouteChokepoints(origin, dest);
  
  // Base risk from chokepoints
  let baseRisk = affectedChokepoints.reduce((sum, cp) => sum + cp.baseRisk, 0) / 
                 Math.max(1, affectedChokepoints.length);

  // Get recent events near the route
  const routeEvents = await getEventsAlongRoute(origin, dest);
  const eventRisk = routeEvents.reduce((sum, e) => sum + (e.severity || 0), 0) / 10;

  // Calculate estimated transit time
  const distance = haversineDistance(origin.lat, origin.lng, dest.lat, dest.lng);
  const baseTransitDays = Math.round(distance / 500); // ~500km per day average
  
  // Add delays from congestion
  const originCongestion = await estimatePortCongestion(originId);
  const destCongestion = await estimatePortCongestion(destId);
  
  const delayDays = (originCongestion?.avgWaitTimeDays || 0) + (destCongestion?.avgWaitTimeDays || 0);

  // Final risk score
  const riskScore = Math.min(10, Math.round((baseRisk + eventRisk) * 10) / 10);

  return {
    routeId: `${originUnlocode}-${destUnlocode}`,
    origin: { portId: originId, name: origin.name, unlocode: origin.unlocode },
    destination: { portId: destId, name: dest.name, unlocode: dest.unlocode },
    estimatedDays: baseTransitDays,
    currentDelayDays: Math.round(delayDays * 10) / 10,
    riskScore,
    activeVessels: Math.round(Math.random() * 50 + 10), // Would come from AIS data
    waypoints: [
      { lat: origin.lat, lng: origin.lng, name: origin.name },
      ...affectedChokepoints.map(cp => ({ lat: cp.lat, lng: cp.lng, name: cp.name })),
      { lat: dest.lat, lng: dest.lng, name: dest.name },
    ],
  };
}

/**
 * Determine which chokepoints a route passes through
 */
function getRouteChokepoints(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): typeof CHOKEPOINTS {
  const affected: typeof CHOKEPOINTS = [];
  
  for (const chokepoint of CHOKEPOINTS) {
    // Simple check: is the chokepoint roughly between origin and destination?
    const distToOrigin = haversineDistance(origin.lat, origin.lng, chokepoint.lat, chokepoint.lng);
    const distToDest = haversineDistance(dest.lat, dest.lng, chokepoint.lat, chokepoint.lng);
    const directDist = haversineDistance(origin.lat, origin.lng, dest.lat, dest.lng);
    
    // If sum of distances to chokepoint is within 50% of direct distance, it's likely on route
    if (distToOrigin + distToDest < directDist * 1.5) {
      affected.push(chokepoint);
    }
  }
  
  return affected;
}

/**
 * Get events along a shipping route
 */
async function getEventsAlongRoute(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): Promise<any[]> {
  // Query events within a corridor between origin and destination
  const minLat = Math.min(origin.lat, dest.lat) - 5;
  const maxLat = Math.max(origin.lat, dest.lat) + 5;
  const minLng = Math.min(origin.lng, dest.lng) - 5;
  const maxLng = Math.max(origin.lng, dest.lng) + 5;

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .gte('occurred_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(50);

  // Filter events that are near the route corridor
  return (events || []).filter(e => {
    if (!e.location) return false;
    const lat = e.location.lat;
    const lng = e.location.lng;
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  });
}

// ============================================================================
// Maritime Alerts
// ============================================================================

/**
 * Get active maritime alerts
 */
export async function getMaritimeAlerts(): Promise<MaritimeAlert[]> {
  const alerts: MaritimeAlert[] = [];
  
  // Get recent severe events and convert to alerts
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .gte('severity', 7)
    .gte('occurred_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
    .order('severity', { ascending: false })
    .limit(20);

  for (const event of events || []) {
    if (!event.location) continue;
    
    alerts.push({
      id: `alert-${event.id}`,
      type: event.type === 'natural_disaster' ? 'weather' : 
            event.type === 'geopolitical' ? 'geopolitical' : 'port_closure',
      severity: event.severity >= 8 ? 'critical' : 'warning',
      location: event.location,
      radius: event.severity >= 8 ? 500 : 200, // km
      title: event.title,
      description: event.description || '',
      startDate: event.occurred_at,
      affectedRoutes: [],
    });
  }

  // Add static high-risk zone alerts
  for (const chokepoint of CHOKEPOINTS.filter(cp => cp.baseRisk >= 5)) {
    alerts.push({
      id: `zone-${chokepoint.name.replace(/\s+/g, '-').toLowerCase()}`,
      type: 'geopolitical',
      severity: chokepoint.baseRisk >= 7 ? 'critical' : 'warning',
      location: { lat: chokepoint.lat, lng: chokepoint.lng },
      radius: 200,
      title: `High Risk Zone: ${chokepoint.name}`,
      description: chokepoint.description,
      startDate: new Date().toISOString(),
      affectedRoutes: [],
    });
  }

  return alerts;
}

// ============================================================================
// AIS Data Integration (placeholder for real API)
// ============================================================================

/**
 * Fetch vessel positions from AIS provider
 * This is a placeholder - in production, integrate with MarineTraffic, VesselFinder, etc.
 * It's paid so atm just justing mock data
 */
export async function fetchVesselPositions(
  boundingBox?: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): Promise<VesselPosition[]> {
  if (!MARINETRAFFIC_API_KEY && !VESSELFINDER_API_KEY) {
    console.log('No maritime API key configured, returning mock data');
    return generateMockVesselData(boundingBox);
  }

  // MarineTraffic API integration
  if (MARINETRAFFIC_API_KEY) {
    try {
      const params = boundingBox 
        ? `MINLAT/${boundingBox.minLat}/MAXLAT/${boundingBox.maxLat}/MINLON/${boundingBox.minLng}/MAXLON/${boundingBox.maxLng}`
        : '';
      
      const url = `${MARINETRAFFIC_BASE}/exportvessels/${MARINETRAFFIC_API_KEY}/v:8/protocol:json/${params}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error('MarineTraffic API error:', response.status);
        return generateMockVesselData(boundingBox);
      }

      const data = await response.json() as any[];
      return (Array.isArray(data) ? data : []).map((v: any) => ({
        mmsi: v.MMSI || '',
        imo: v.IMO || undefined,
        name: v.SHIPNAME || 'Unknown',
        shipType: v.SHIPTYPE || 'Unknown',
        latitude: parseFloat(v.LAT) || 0,
        longitude: parseFloat(v.LON) || 0,
        course: parseFloat(v.COURSE) || 0,
        speed: parseFloat(v.SPEED) || 0,
        heading: parseFloat(v.HEADING) || 0,
        destination: v.DESTINATION || undefined,
        eta: v.ETA || undefined,
        timestamp: v.TIMESTAMP || new Date().toISOString(),
      }));
    } catch (error) {
      console.error('MarineTraffic fetch error:', error);
      return generateMockVesselData(boundingBox);
    }
  }

  return generateMockVesselData(boundingBox);
}

/**
 * Generate mock vessel data for development
 */
function generateMockVesselData(
  boundingBox?: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): VesselPosition[] {
  const vessels: VesselPosition[] = [];
  const shipTypes = ['Container Ship', 'Bulk Carrier', 'Tanker', 'Cargo Ship', 'LNG Carrier'];
  
  // Generate vessels near major ports
  for (const port of Object.values(MAJOR_PORTS)) {
    const numVessels = Math.floor(Math.random() * 5) + 3;
    
    for (let i = 0; i < numVessels; i++) {
      const lat = port.lat + (Math.random() - 0.5) * 2;
      const lng = port.lng + (Math.random() - 0.5) * 2;
      
      if (boundingBox) {
        if (lat < boundingBox.minLat || lat > boundingBox.maxLat ||
            lng < boundingBox.minLng || lng > boundingBox.maxLng) {
          continue;
        }
      }
      
      vessels.push({
        mmsi: `${Math.floor(Math.random() * 900000000) + 100000000}`,
        name: `VESSEL ${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        shipType: shipTypes[Math.floor(Math.random() * shipTypes.length)],
        latitude: lat,
        longitude: lng,
        course: Math.random() * 360,
        speed: Math.random() * 15 + 5,
        heading: Math.random() * 360,
        destination: port.name,
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  return vessels;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate distance between two points using Haversine formula
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * Math.PI / 180;
}

/**
 * Get port by UNLOCODE
 */
export function getPortByUnlocode(unlocode: string): typeof MAJOR_PORTS[string] | null {
  const entry = Object.entries(MAJOR_PORTS).find(([_, p]) => p.unlocode === unlocode);
  return entry ? entry[1] : null;
}

/**
 * Get all ports
 */
export function getAllPorts(): Array<typeof MAJOR_PORTS[string] & { id: string }> {
  return Object.entries(MAJOR_PORTS).map(([id, port]) => ({ id, ...port }));
}

/**
 * Get all chokepoints
 */
export function getAllChokepoints(): typeof CHOKEPOINTS {
  return [...CHOKEPOINTS];
}
