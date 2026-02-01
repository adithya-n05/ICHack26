// backend/src/services/connectionRisk.ts
// Service for calculating and explaining connection/route risks
// Integrates Monte Carlo simulation, ML sentiment analysis, and event proximity

import { supabase } from '../lib/supabase';
import OpenAI from 'openai';
import { runMonteCarloSimulation } from './monteCarlo';
import { analyzeNewsSentiment } from './mlRiskEngine';

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ============================================================================
// Types
// ============================================================================

export interface ConnectionRiskDetails {
  connectionId: string;
  status: 'healthy' | 'monitoring' | 'at-risk' | 'critical' | 'disrupted';
  riskScore: number; // 0-100
  explanation: string; // GPT-generated summary
  factors: RiskFactor[];
  relatedEvents: RelatedEvent[];
  lastUpdated: string;
}

export interface RiskFactor {
  name: string;
  contribution: number; // 0-100
  description: string;
}

export interface RelatedEvent {
  id: string;
  title: string;
  type: string;
  severity: number;
  distance: number; // km from route
  timestamp: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Calculate distance between two points using Haversine formula
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate minimum distance from a point to a line segment (route)
 */
function distanceToRoute(
  pointLat: number, 
  pointLng: number, 
  fromLat: number, 
  fromLng: number, 
  toLat: number, 
  toLng: number
): number {
  // Simplified: just use perpendicular distance or closest endpoint
  const d1 = haversineDistance(pointLat, pointLng, fromLat, fromLng);
  const d2 = haversineDistance(pointLat, pointLng, toLat, toLng);
  
  // Midpoint distance as approximation
  const midLat = (fromLat + toLat) / 2;
  const midLng = (fromLng + toLng) / 2;
  const dMid = haversineDistance(pointLat, pointLng, midLat, midLng);
  
  return Math.min(d1, d2, dMid);
}

/**
 * Get risk status from score
 */
function scoreToStatus(score: number): 'healthy' | 'monitoring' | 'at-risk' | 'critical' | 'disrupted' {
  if (score >= 80) return 'disrupted';
  if (score >= 60) return 'critical';
  if (score >= 40) return 'at-risk';
  if (score >= 20) return 'monitoring';
  return 'healthy';
}

/**
 * Convert database status to numeric score (for baseline)
 */
function statusToScore(status: string): number {
  switch (status?.toLowerCase()) {
    case 'disrupted': return 85;
    case 'critical': return 70;
    case 'at-risk': return 50;
    case 'monitoring': return 30;
    case 'healthy': return 10;
    default: return 25; // Default to monitoring-level if unknown
  }
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Calculate risk for a specific connection using multiple risk engines:
 * 1. Existing database status (baseline)
 * 2. Monte Carlo simulation (probabilistic forecasting)
 * 3. ML sentiment analysis (news/event text analysis)
 * 4. Event proximity (geographic analysis)
 * 5. Geopolitical factors
 */
export async function calculateConnectionRisk(connectionId: string): Promise<ConnectionRiskDetails | null> {
  // Get connection details INCLUDING existing status
  const { data: connection, error: connError } = await supabase
    .from('connections')
    .select('*, from_node:companies!connections_from_node_id_fkey(*), to_node:companies!connections_to_node_id_fkey(*)')
    .eq('id', connectionId)
    .single();

  if (connError || !connection) {
    console.error('Error fetching connection:', connError);
    return null;
  }

  const fromNode = connection.from_node;
  const toNode = connection.to_node;

  if (!fromNode?.lat || !fromNode?.lng || !toNode?.lat || !toNode?.lng) {
    return null;
  }

  // ============================================================================
  // FACTOR 1: Existing Database Status (baseline - 30% weight)
  // ============================================================================
  const existingStatus = connection.status || 'monitoring';
  const baselineScore = statusToScore(existingStatus);

  // ============================================================================
  // FACTOR 2: Monte Carlo Simulation (probabilistic - 25% weight)
  // ============================================================================
  let monteCarloScore = 30; // Default if simulation fails
  let scenarioSummary = '';
  try {
    const mcResult = await runMonteCarloSimulation(
      { 
        routeOrigin: fromNode.name,
        routeDestination: toNode.name 
      },
      { 
        iterations: 1000, // Reduced for performance
        timeHorizonDays: 30,
        includeBlackSwans: true 
      }
    );
    
    // Convert risk distribution to 0-100 score
    monteCarloScore = Math.min(100, mcResult.riskDistribution.mean * 10);
    
    // Get top scenarios for explanation
    const topScenarios = mcResult.scenarioProbabilities
      .filter(s => s.probability > 0.05)
      .slice(0, 3);
    if (topScenarios.length > 0) {
      scenarioSummary = topScenarios
        .map(s => `${s.scenario} (${(s.probability * 100).toFixed(0)}% chance)`)
        .join(', ');
    }
  } catch (err) {
    console.error('Monte Carlo simulation failed:', err);
  }

  // ============================================================================
  // FACTOR 3: Event Proximity Analysis (geographic - 25% weight)
  // ============================================================================
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .gte('start_date', weekAgo.toISOString())
    .not('lat', 'eq', 0)
    .not('lng', 'eq', 0);

  if (eventsError) {
    console.error('Error fetching events:', eventsError);
  }

  const IMPACT_RADIUS = 500;
  const relatedEvents: RelatedEvent[] = [];
  let eventProximityScore = 0;

  for (const event of events || []) {
    const distance = distanceToRoute(
      event.lat,
      event.lng,
      fromNode.lat,
      fromNode.lng,
      toNode.lat,
      toNode.lng
    );

    if (distance <= IMPACT_RADIUS) {
      const proximityFactor = 1 - (distance / IMPACT_RADIUS);
      const eventRisk = (event.severity / 10) * proximityFactor * 30;
      eventProximityScore += eventRisk;

      relatedEvents.push({
        id: event.id,
        title: event.title,
        type: event.type,
        severity: event.severity,
        distance: Math.round(distance),
        timestamp: event.start_date,
      });
    }
  }
  
  // Cap at 100
  eventProximityScore = Math.min(100, eventProximityScore);

  // ============================================================================
  // FACTOR 4: ML Sentiment Analysis on Recent Events (10% weight)
  // ============================================================================
  let sentimentScore = 30; // Default neutral
  if (relatedEvents.length > 0) {
    let totalSentiment = 0;
    let sentimentCount = 0;
    
    for (const event of relatedEvents.slice(0, 5)) {
      try {
        const sentiment = await analyzeNewsSentiment(event.title);
        // Convert -1 to 1 scale to 0-100 risk (negative = high risk)
        const eventSentimentRisk = ((1 - sentiment.score) / 2) * 100;
        totalSentiment += eventSentimentRisk * sentiment.magnitude;
        sentimentCount += sentiment.magnitude;
      } catch (err) {
        // Fallback: use severity as proxy
        totalSentiment += event.severity * 10;
        sentimentCount += 1;
      }
    }
    
    if (sentimentCount > 0) {
      sentimentScore = totalSentiment / sentimentCount;
    }
  }

  // ============================================================================
  // FACTOR 5: Geopolitical Risk (10% weight)
  // ============================================================================
  const geopoliticalScore = calculateGeopoliticalRisk(fromNode.country, toNode.country);

  // Sort events by severity and distance
  relatedEvents.sort((a, b) => {
    const scoreA = a.severity / (a.distance + 1);
    const scoreB = b.severity / (b.distance + 1);
    return scoreB - scoreA;
  });

  // ============================================================================
  // WEIGHTED COMBINATION
  // ============================================================================
  const factors: RiskFactor[] = [];
  
  // Baseline from existing status
  factors.push({
    name: 'Current Status',
    contribution: Math.round(baselineScore * 0.30),
    description: `Route is currently marked as ${existingStatus.toUpperCase()} in the system`,
  });

  // Monte Carlo
  if (monteCarloScore > 10) {
    const mcContribution = Math.round(monteCarloScore * 0.25);
    factors.push({
      name: 'Probabilistic Forecast',
      contribution: mcContribution,
      description: scenarioSummary 
        ? `Monte Carlo analysis: ${scenarioSummary}`
        : `30-day risk projection based on 1000 simulations`,
    });
  }

  // Event proximity
  if (eventProximityScore > 10) {
    factors.push({
      name: 'Nearby Events',
      contribution: Math.round(eventProximityScore * 0.25),
      description: `${relatedEvents.length} active event(s) within ${IMPACT_RADIUS}km of this route`,
    });
  }

  // Sentiment
  if (sentimentScore > 20 && relatedEvents.length > 0) {
    factors.push({
      name: 'Event Sentiment',
      contribution: Math.round(sentimentScore * 0.10),
      description: `AI analysis of event text indicates ${sentimentScore > 50 ? 'negative' : 'neutral'} risk signals`,
    });
  }

  // Geopolitical
  if (geopoliticalScore > 5) {
    factors.push({
      name: 'Geopolitical Risk',
      contribution: Math.round(geopoliticalScore * 0.10),
      description: `Route passes through regions with elevated geopolitical tensions`,
    });
  }

  // Calculate final weighted score
  const finalScore = Math.min(100, Math.round(
    (baselineScore * 0.30) +
    (monteCarloScore * 0.25) +
    (eventProximityScore * 0.25) +
    (sentimentScore * 0.10) +
    (geopoliticalScore * 0.10)
  ));

  const status = scoreToStatus(finalScore);

  // Generate explanation using GPT if available
  const explanation = await generateExplanation(
    fromNode.name,
    toNode.name,
    status,
    finalScore,
    factors,
    relatedEvents.slice(0, 5),
    scenarioSummary
  );

  return {
    connectionId,
    status,
    riskScore: finalScore,
    explanation,
    factors,
    relatedEvents: relatedEvents.slice(0, 10),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Calculate geopolitical risk based on country pair
 */
function calculateGeopoliticalRisk(fromCountry: string, toCountry: string): number {
  const highRiskCountries = ['RU', 'UA', 'CN', 'TW', 'IR', 'KP', 'MM', 'AF', 'SY', 'YE'];
  const mediumRiskCountries = ['IN', 'PK', 'IL', 'LB', 'VE', 'NG', 'EG'];
  
  let risk = 0;
  
  if (highRiskCountries.includes(fromCountry) || highRiskCountries.includes(toCountry)) {
    risk += 25;
  } else if (mediumRiskCountries.includes(fromCountry) || mediumRiskCountries.includes(toCountry)) {
    risk += 10;
  }
  
  // Cross-strait or cross-border tensions
  const tensionPairs = [
    ['CN', 'TW'], ['IN', 'PK'], ['IL', 'IR'], ['RU', 'UA'], ['KR', 'KP']
  ];
  
  for (const [a, b] of tensionPairs) {
    if ((fromCountry === a && toCountry === b) || (fromCountry === b && toCountry === a)) {
      risk += 15;
    }
  }
  
  return risk;
}

/**
 * Calculate transport mode inherent risk
 */
function calculateTransportRisk(mode: string): number {
  switch (mode?.toLowerCase()) {
    case 'sea':
      return 5; // Piracy, weather, port congestion
    case 'air':
      return 3; // Generally reliable but expensive
    case 'land':
      return 8; // Border crossings, road conditions
    case 'rail':
      return 4;
    default:
      return 5;
  }
}

/**
 * Generate human-readable explanation using GPT-4o
 */
async function generateExplanation(
  fromName: string,
  toName: string,
  status: string,
  riskScore: number,
  factors: RiskFactor[],
  events: RelatedEvent[],
  scenarioSummary?: string
): Promise<string> {
  // Build context for GPT
  const factorSummary = factors
    .map(f => `- ${f.name}: ${f.contribution}% impact (${f.description})`)
    .join('\n');
  
  const eventSummary = events.length > 0
    ? events.map(e => `- ${e.title} (${e.type}, severity ${e.severity}/10, ${e.distance}km away, ${new Date(e.timestamp).toLocaleDateString()})`).join('\n')
    : 'No recent events affecting this route.';

  const scenarioInfo = scenarioSummary 
    ? `\nMonte Carlo Simulation Key Scenarios: ${scenarioSummary}`
    : '';

  // If no OpenAI, generate a simple explanation
  if (!openai) {
    return generateSimpleExplanation(fromName, toName, status, riskScore, factors, events, scenarioSummary);
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a supply chain risk analyst providing concise, actionable risk assessments. Generate a brief 2-3 sentence explanation of route risk. Be specific about the contributing factors - mention Monte Carlo projections, event proximity, geopolitical factors, and sentiment analysis if they're significant contributors. The risk score and status should match what you describe.`
        },
        {
          role: 'user',
          content: `Explain the risk for this supply route:

Route: ${fromName} → ${toName}
Status: ${status.toUpperCase()}
Risk Score: ${riskScore}/100

Risk Factors (weighted contributions):
${factorSummary || 'No significant risk factors.'}
${scenarioInfo}

Recent Events Near Route:
${eventSummary}

Provide a 2-3 sentence summary explaining why this route has a ${riskScore}/100 risk score (${status.toUpperCase()} status). Reference the specific factors and their contributions.`
        }
      ],
      max_tokens: 200,
      temperature: 0.5,
    });

    return response.choices[0]?.message?.content?.trim() || 
           generateSimpleExplanation(fromName, toName, status, riskScore, factors, events, scenarioSummary);
  } catch (error) {
    console.error('GPT explanation error:', error);
    return generateSimpleExplanation(fromName, toName, status, riskScore, factors, events, scenarioSummary);
  }
}

/**
 * Generate explanation without GPT
 */
function generateSimpleExplanation(
  fromName: string,
  toName: string,
  status: string,
  riskScore: number,
  factors: RiskFactor[],
  events: RelatedEvent[],
  scenarioSummary?: string
): string {
  const sortedFactors = [...factors].sort((a, b) => b.contribution - a.contribution);
  const topFactor = sortedFactors[0];
  
  let explanation = `The route from ${fromName} to ${toName} is currently ${status.toUpperCase()} with a risk score of ${riskScore}/100. `;
  
  if (sortedFactors.length >= 2) {
    explanation += `Primary contributors: ${sortedFactors.slice(0, 2).map(f => `${f.name} (${f.contribution}%)`).join(' and ')}. `;
  } else if (topFactor) {
    explanation += `The primary risk factor is ${topFactor.name.toLowerCase()} (${topFactor.contribution}% contribution). `;
  }
  
  if (scenarioSummary) {
    explanation += `Probabilistic modeling indicates: ${scenarioSummary}. `;
  } else if (events.length > 0) {
    const topEvent = events[0];
    explanation += `${events.length} active event(s) are affecting this route, including "${topEvent.title}" (${topEvent.distance}km away).`;
  } else if (riskScore < 30) {
    explanation += `No significant disruption signals detected at this time.`;
  }
  
  return explanation;
}

/**
 * Update all connection risk statuses (called by cron job)
 */
export async function updateAllConnectionRisks(): Promise<void> {
  console.log('Updating connection risk statuses...');
  
  const { data: connections, error } = await supabase
    .from('connections')
    .select('id');

  if (error || !connections) {
    console.error('Error fetching connections:', error);
    return;
  }

  let updated = 0;
  for (const conn of connections) {
    const risk = await calculateConnectionRisk(conn.id);
    if (risk) {
      // Update connection status in database
      await supabase
        .from('connections')
        .update({ 
          status: risk.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', conn.id);
      updated++;
    }
  }

  console.log(`Updated ${updated} connection risk statuses`);
}

/**
 * Get cached or calculate connection risk
 */
export async function getConnectionRisk(connectionId: string): Promise<ConnectionRiskDetails | null> {
  // For now, always calculate fresh (could add caching later)
  return calculateConnectionRisk(connectionId);
}
