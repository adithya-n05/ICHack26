// backend/src/services/monteCarlo.ts
// Monte Carlo Simulation for Supply Chain Risk Analysis

import { supabase } from '../lib/supabase';
import { runQuery, getDriver } from '../lib/neo4j';
import { calculateRouteRisk, estimatePortCongestion } from './maritime';

// ============================================================================
// Types
// ============================================================================

export interface SimulationConfig {
  iterations: number;
  timeHorizonDays: number;
  confidenceLevel: number; // e.g., 0.95 for 95%
  includeBlackSwans: boolean;
}

export interface ScenarioInput {
  companyId?: string;
  routeOrigin?: string;
  routeDestination?: string;
  supplyChainNodes?: string[];
}

export interface SimulationResult {
  scenarioId: string;
  iterations: number;
  timeHorizon: number;
  
  // Risk Distribution
  riskDistribution: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
    percentile5: number;
    percentile95: number;
    var95: number; // Value at Risk (95%)
    cvar95: number; // Conditional VaR (Expected Shortfall)
  };
  
  // Delay Distribution
  delayDistribution: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
    percentile95: number;
  };
  
  // Cost Impact
  costImpact: {
    expectedCost: number;
    worstCase: number;
    bestCase: number;
    var95: number;
  };
  
  // Scenario Probabilities
  scenarioProbabilities: Array<{
    scenario: string;
    probability: number;
    impact: number;
    description: string;
  }>;
  
  // Key Risk Drivers
  keyDrivers: Array<{
    factor: string;
    contribution: number;
    sensitivity: number;
  }>;
  
  // Confidence interval
  confidenceInterval: {
    lower: number;
    upper: number;
    level: number;
  };
}

export interface RiskEvent {
  type: string;
  probability: number;
  impactMean: number;
  impactStdDev: number;
  durationDays: number;
  affectedNodes: string[];
}

// ============================================================================
// Risk Event Definitions
// ============================================================================

const BASE_RISK_EVENTS: RiskEvent[] = [
  // Natural Disasters
  {
    type: 'major_earthquake',
    probability: 0.002, // Per day in high-risk zone
    impactMean: 8,
    impactStdDev: 1.5,
    durationDays: 30,
    affectedNodes: [],
  },
  {
    type: 'typhoon_hurricane',
    probability: 0.01, // Seasonal, varies by region
    impactMean: 6,
    impactStdDev: 2,
    durationDays: 7,
    affectedNodes: [],
  },
  {
    type: 'flooding',
    probability: 0.015,
    impactMean: 5,
    impactStdDev: 1.5,
    durationDays: 14,
    affectedNodes: [],
  },
  
  // Geopolitical
  {
    type: 'trade_sanctions',
    probability: 0.005,
    impactMean: 7,
    impactStdDev: 2,
    durationDays: 180,
    affectedNodes: [],
  },
  {
    type: 'tariff_increase',
    probability: 0.02,
    impactMean: 4,
    impactStdDev: 1,
    durationDays: 365,
    affectedNodes: [],
  },
  {
    type: 'political_instability',
    probability: 0.01,
    impactMean: 6,
    impactStdDev: 2,
    durationDays: 90,
    affectedNodes: [],
  },
  
  // Infrastructure
  {
    type: 'port_closure',
    probability: 0.008,
    impactMean: 7,
    impactStdDev: 1.5,
    durationDays: 14,
    affectedNodes: [],
  },
  {
    type: 'canal_blockage',
    probability: 0.001,
    impactMean: 9,
    impactStdDev: 0.5,
    durationDays: 7,
    affectedNodes: [],
  },
  {
    type: 'port_congestion',
    probability: 0.05,
    impactMean: 4,
    impactStdDev: 1,
    durationDays: 21,
    affectedNodes: [],
  },
  
  // Labor
  {
    type: 'dock_strike',
    probability: 0.02,
    impactMean: 5,
    impactStdDev: 1.5,
    durationDays: 14,
    affectedNodes: [],
  },
  
  // Pandemic/Health
  {
    type: 'pandemic_wave',
    probability: 0.003,
    impactMean: 7,
    impactStdDev: 2,
    durationDays: 60,
    affectedNodes: [],
  },
  
  // Cyber
  {
    type: 'cyberattack',
    probability: 0.01,
    impactMean: 5,
    impactStdDev: 2,
    durationDays: 7,
    affectedNodes: [],
  },
  
  // Black Swan Events (low probability, extreme impact)
  {
    type: 'major_conflict',
    probability: 0.0005,
    impactMean: 10,
    impactStdDev: 0,
    durationDays: 365,
    affectedNodes: [],
  },
  {
    type: 'global_supply_shock',
    probability: 0.001,
    impactMean: 9,
    impactStdDev: 1,
    durationDays: 180,
    affectedNodes: [],
  },
];

// ============================================================================
// Statistical Utilities
// ============================================================================

/**
 * Generate normally distributed random number (Box-Muller transform)
 */
function randomNormal(mean: number = 0, stdDev: number = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

/**
 * Generate log-normally distributed random number
 * (for heavy-tailed distributions like loss events)
 */
function randomLogNormal(mean: number, stdDev: number): number {
  const mu = Math.log(mean * mean / Math.sqrt(stdDev * stdDev + mean * mean));
  const sigma = Math.sqrt(Math.log(1 + (stdDev * stdDev) / (mean * mean)));
  return Math.exp(randomNormal(mu, sigma));
}

/**
 * Sample from Poisson distribution
 */
function randomPoisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  
  return k - 1;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArr: number[], p: number): number {
  const index = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  if (upper >= sortedArr.length) return sortedArr[sortedArr.length - 1];
  return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight;
}

/**
 * Calculate standard deviation
 */
function stdDev(arr: number[]): number {
  const n = arr.length;
  if (n === 0) return 0;
  
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  return Math.sqrt(variance);
}

// ============================================================================
// Monte Carlo Simulation Engine
// ============================================================================

/**
 * Run a single simulation iteration
 */
function runIteration(
  baseRisk: number,
  events: RiskEvent[],
  timeHorizonDays: number,
  includeBlackSwans: boolean
): { risk: number; delay: number; events: string[] } {
  let cumulativeRisk = baseRisk;
  let totalDelay = 0;
  const triggeredEvents: string[] = [];

  // Filter out black swans if not included
  const activeEvents = includeBlackSwans 
    ? events 
    : events.filter(e => !['major_conflict', 'global_supply_shock'].includes(e.type));

  // Simulate events for each day in the horizon
  for (const event of activeEvents) {
    // Calculate expected number of events in time horizon
    const expectedEvents = event.probability * timeHorizonDays;
    
    // Sample from Poisson distribution
    const numEvents = randomPoisson(expectedEvents);
    
    if (numEvents > 0) {
      for (let i = 0; i < numEvents; i++) {
        // Sample impact from log-normal distribution
        const impact = Math.min(10, Math.max(0, 
          randomLogNormal(event.impactMean, event.impactStdDev)
        ));
        
        cumulativeRisk += impact * 0.3; // Impact contributes to overall risk
        totalDelay += event.durationDays * (impact / 10);
        triggeredEvents.push(event.type);
      }
    }
  }

  // Add random variation (market volatility, etc.)
  cumulativeRisk += randomNormal(0, 1);
  
  // Clamp risk to 0-10 scale
  cumulativeRisk = Math.max(0, Math.min(10, cumulativeRisk));

  return {
    risk: cumulativeRisk,
    delay: totalDelay,
    events: triggeredEvents,
  };
}

/**
 * Get base risk from knowledge graph
 */
async function getBaseRisk(input: ScenarioInput): Promise<number> {
  if (!getDriver()) return 5; // Default if no graph

  try {
    if (input.companyId) {
      const result = await runQuery(`
        MATCH (c:Company {id: $companyId})
        OPTIONAL MATCH (c)-[:LOCATED_IN]->(country:Country)
        OPTIONAL MATCH (e:Event)-[:OCCURRED_IN]->(country)
        WHERE e.occurred_at >= datetime() - duration('P7D')
        RETURN avg(e.severity) as avgSeverity
      `, { companyId: input.companyId });
      
      return result[0]?.avgSeverity || 3;
    }

    if (input.routeOrigin && input.routeDestination) {
      const route = await calculateRouteRisk(input.routeOrigin, input.routeDestination);
      return route?.riskScore || 4;
    }

    return 4; // Default base risk
  } catch (error) {
    console.error('Failed to get base risk:', error);
    return 5;
  }
}

/**
 * Adjust event probabilities based on current context
 */
async function adjustEventProbabilities(
  events: RiskEvent[],
  input: ScenarioInput
): Promise<RiskEvent[]> {
  const adjusted = events.map(e => ({ ...e }));

  // Get current events from database to adjust probabilities
  const { data: recentEvents } = await supabase
    .from('events')
    .select('type, severity')
    .gte('occurred_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .limit(100);

  if (recentEvents) {
    // If similar events have occurred recently, increase probability
    const eventCounts: Record<string, number> = {};
    for (const e of recentEvents) {
      eventCounts[e.type] = (eventCounts[e.type] || 0) + 1;
    }

    for (const event of adjusted) {
      if (event.type.includes('earthquake') && eventCounts['natural_disaster'] > 2) {
        event.probability *= 1.5;
      }
      if (event.type.includes('congestion') && eventCounts['infrastructure'] > 3) {
        event.probability *= 1.3;
      }
      if (event.type.includes('conflict') || event.type.includes('sanction')) {
        if (eventCounts['geopolitical'] > 2) {
          event.probability *= 1.4;
        }
      }
    }
  }

  // Adjust for port congestion if route specified
  if (input.routeOrigin) {
    const originCongestion = await estimatePortCongestion(`port-${input.routeOrigin.toLowerCase()}`);
    if (originCongestion?.congestionLevel === 'severe') {
      const congestionEvent = adjusted.find(e => e.type === 'port_congestion');
      if (congestionEvent) {
        congestionEvent.probability *= 2;
      }
    }
  }

  return adjusted;
}

// ============================================================================
// Main Simulation Functions
// ============================================================================

/**
 * Run Monte Carlo simulation for supply chain risk
 */
export async function runMonteCarloSimulation(
  input: ScenarioInput,
  config: Partial<SimulationConfig> = {}
): Promise<SimulationResult> {
  const {
    iterations = 10000,
    timeHorizonDays = 90,
    confidenceLevel = 0.95,
    includeBlackSwans = true,
  } = config;

  // Get base risk from current state
  const baseRisk = await getBaseRisk(input);
  
  // Adjust event probabilities based on context
  const adjustedEvents = await adjustEventProbabilities(BASE_RISK_EVENTS, input);

  // Run simulations
  const riskResults: number[] = [];
  const delayResults: number[] = [];
  const eventOccurrences: Record<string, number> = {};

  for (let i = 0; i < iterations; i++) {
    const result = runIteration(baseRisk, adjustedEvents, timeHorizonDays, includeBlackSwans);
    riskResults.push(result.risk);
    delayResults.push(result.delay);
    
    for (const event of result.events) {
      eventOccurrences[event] = (eventOccurrences[event] || 0) + 1;
    }
  }

  // Sort results for percentile calculations
  const sortedRisks = [...riskResults].sort((a, b) => a - b);
  const sortedDelays = [...delayResults].sort((a, b) => a - b);

  // Calculate statistics
  const riskMean = riskResults.reduce((a, b) => a + b, 0) / iterations;
  const delayMean = delayResults.reduce((a, b) => a + b, 0) / iterations;
  
  const riskStdDev = stdDev(riskResults);
  const delayStdDev = stdDev(delayResults);

  const var95Index = Math.floor(iterations * 0.95);
  const var95 = sortedRisks[var95Index];
  
  // CVaR (Expected Shortfall) - average of worst 5%
  const tailRisks = sortedRisks.slice(var95Index);
  const cvar95 = tailRisks.reduce((a, b) => a + b, 0) / tailRisks.length;

  // Calculate scenario probabilities
  const scenarioProbabilities = Object.entries(eventOccurrences)
    .map(([event, count]) => {
      const eventDef = BASE_RISK_EVENTS.find(e => e.type === event);
      return {
        scenario: event.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        probability: count / iterations,
        impact: eventDef?.impactMean || 5,
        description: getEventDescription(event),
      };
    })
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 10);

  // Calculate key risk drivers (sensitivity analysis)
  const keyDrivers = await calculateSensitivity(input, baseRisk, adjustedEvents, timeHorizonDays);

  // Cost estimation (simplified model)
  const baseDailyCost = 10000; // $ per day of delay
  const costResults = delayResults.map(d => d * baseDailyCost);
  const sortedCosts = [...costResults].sort((a, b) => a - b);

  return {
    scenarioId: `sim-${Date.now()}`,
    iterations,
    timeHorizon: timeHorizonDays,
    
    riskDistribution: {
      min: sortedRisks[0],
      max: sortedRisks[sortedRisks.length - 1],
      mean: Math.round(riskMean * 100) / 100,
      median: percentile(sortedRisks, 50),
      stdDev: Math.round(riskStdDev * 100) / 100,
      percentile5: percentile(sortedRisks, 5),
      percentile95: percentile(sortedRisks, 95),
      var95: Math.round(var95 * 100) / 100,
      cvar95: Math.round(cvar95 * 100) / 100,
    },
    
    delayDistribution: {
      min: sortedDelays[0],
      max: sortedDelays[sortedDelays.length - 1],
      mean: Math.round(delayMean * 10) / 10,
      median: percentile(sortedDelays, 50),
      stdDev: Math.round(delayStdDev * 10) / 10,
      percentile95: percentile(sortedDelays, 95),
    },
    
    costImpact: {
      expectedCost: Math.round(costResults.reduce((a, b) => a + b, 0) / iterations),
      worstCase: Math.round(sortedCosts[sortedCosts.length - 1]),
      bestCase: Math.round(sortedCosts[0]),
      var95: Math.round(percentile(sortedCosts, 95)),
    },
    
    scenarioProbabilities,
    keyDrivers,
    
    confidenceInterval: {
      lower: percentile(sortedRisks, (1 - confidenceLevel) * 100 / 2),
      upper: percentile(sortedRisks, 100 - (1 - confidenceLevel) * 100 / 2),
      level: confidenceLevel,
    },
  };
}

/**
 * Calculate sensitivity of risk to different factors
 */
async function calculateSensitivity(
  input: ScenarioInput,
  baseRisk: number,
  events: RiskEvent[],
  timeHorizon: number
): Promise<Array<{ factor: string; contribution: number; sensitivity: number }>> {
  const drivers: Array<{ factor: string; contribution: number; sensitivity: number }> = [];
  
  // Test sensitivity by varying each event probability
  const baselineResults: number[] = [];
  for (let i = 0; i < 1000; i++) {
    baselineResults.push(runIteration(baseRisk, events, timeHorizon, true).risk);
  }
  const baselineMean = baselineResults.reduce((a, b) => a + b, 0) / baselineResults.length;

  for (const event of events.slice(0, 8)) { // Top 8 events
    // Increase probability by 50%
    const modifiedEvents = events.map(e => 
      e.type === event.type ? { ...e, probability: e.probability * 1.5 } : e
    );
    
    const modifiedResults: number[] = [];
    for (let i = 0; i < 1000; i++) {
      modifiedResults.push(runIteration(baseRisk, modifiedEvents, timeHorizon, true).risk);
    }
    const modifiedMean = modifiedResults.reduce((a, b) => a + b, 0) / modifiedResults.length;
    
    const sensitivity = (modifiedMean - baselineMean) / baselineMean;
    const contribution = event.probability * event.impactMean;
    
    drivers.push({
      factor: event.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      contribution: Math.round(contribution * 1000) / 1000,
      sensitivity: Math.round(sensitivity * 1000) / 1000,
    });
  }

  return drivers.sort((a, b) => b.sensitivity - a.sensitivity);
}

/**
 * Get human-readable description for event types
 */
function getEventDescription(eventType: string): string {
  const descriptions: Record<string, string> = {
    major_earthquake: 'Magnitude 7+ earthquake affecting supply chain infrastructure',
    typhoon_hurricane: 'Major tropical storm causing port closures and shipping delays',
    flooding: 'Severe flooding impacting transportation and warehousing',
    trade_sanctions: 'New trade sanctions or export restrictions',
    tariff_increase: 'Significant tariff increases on goods',
    political_instability: 'Political unrest or regime change affecting trade',
    port_closure: 'Major port closure due to incident or maintenance',
    canal_blockage: 'Shipping canal blockage (e.g., Suez, Panama)',
    port_congestion: 'Severe port congestion causing significant delays',
    dock_strike: 'Labor strike affecting port operations',
    pandemic_wave: 'New pandemic wave causing lockdowns',
    cyberattack: 'Major cyberattack on logistics systems',
    major_conflict: 'Armed conflict affecting trade routes',
    global_supply_shock: 'Global supply chain disruption event',
  };
  
  return descriptions[eventType] || 'Supply chain disruption event';
}

/**
 * Run quick simulation with fewer iterations (for real-time use)
 */
export async function runQuickSimulation(
  input: ScenarioInput
): Promise<Pick<SimulationResult, 'riskDistribution' | 'delayDistribution' | 'scenarioProbabilities'>> {
  const result = await runMonteCarloSimulation(input, {
    iterations: 1000,
    timeHorizonDays: 30,
    includeBlackSwans: false,
  });

  return {
    riskDistribution: result.riskDistribution,
    delayDistribution: result.delayDistribution,
    scenarioProbabilities: result.scenarioProbabilities,
  };
}
