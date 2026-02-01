// backend/src/services/explainability.ts
// SHAP-like Explainability Layer for Risk Predictions
// Provides human-interpretable explanations for risk scores

import { runQuery, getDriver } from '../lib/neo4j';
import { supabase } from '../lib/supabase';
import { analyzeNewsSentiment } from './mlRiskEngine';

// ============================================================================
// Types
// ============================================================================

export interface FeatureContribution {
  feature: string;
  value: number | string;
  contribution: number; // SHAP value (-∞ to +∞, positive = increases risk)
  importance: number;   // Absolute importance (0-1)
  direction: 'increases' | 'decreases' | 'neutral';
  explanation: string;
}

export interface RiskExplanation {
  entityId: string;
  entityType: 'company' | 'port' | 'country';
  baseRisk: number;
  finalRisk: number;
  features: FeatureContribution[];
  summary: string;
  topRiskFactors: string[];
  topProtectiveFactors: string[];
  confidenceScore: number;
  methodology: string;
}

export interface FeatureImportance {
  feature: string;
  globalImportance: number;
  description: string;
}

// ============================================================================
// Feature Definitions
// ============================================================================

// Global feature importance weights (derived from model training/analysis)
const FEATURE_DEFINITIONS: Record<string, {
  weight: number;
  description: string;
  category: 'geographic' | 'event' | 'supply_chain' | 'economic' | 'temporal';
}> = {
  // Geographic Features
  geopolitical_stability: {
    weight: 0.15,
    description: 'Political stability index of operating region',
    category: 'geographic',
  },
  natural_disaster_risk: {
    weight: 0.12,
    description: 'Historical frequency of natural disasters',
    category: 'geographic',
  },
  distance_to_chokepoint: {
    weight: 0.08,
    description: 'Proximity to critical shipping chokepoints',
    category: 'geographic',
  },
  
  // Event Features
  recent_event_count: {
    weight: 0.18,
    description: 'Number of disruption events in past 7 days',
    category: 'event',
  },
  avg_event_severity: {
    weight: 0.14,
    description: 'Average severity of recent events',
    category: 'event',
  },
  news_sentiment: {
    weight: 0.10,
    description: 'Sentiment analysis of recent news',
    category: 'event',
  },
  
  // Supply Chain Features
  supplier_concentration: {
    weight: 0.12,
    description: 'Degree of reliance on single suppliers/routes',
    category: 'supply_chain',
  },
  port_congestion: {
    weight: 0.08,
    description: 'Current congestion at key ports',
    category: 'supply_chain',
  },
  route_complexity: {
    weight: 0.06,
    description: 'Number of intermediary points in supply chain',
    category: 'supply_chain',
  },
  
  // Economic Features
  tariff_exposure: {
    weight: 0.07,
    description: 'Exposure to trade tariffs',
    category: 'economic',
  },
  currency_volatility: {
    weight: 0.04,
    description: 'Volatility in relevant currency pairs',
    category: 'economic',
  },
  
  // Temporal Features
  seasonal_risk: {
    weight: 0.06,
    description: 'Time-of-year risk factors (monsoon, winter, etc.)',
    category: 'temporal',
  },
};

// Geopolitical stability scores (0-10, higher = more stable)
const COUNTRY_STABILITY: Record<string, number> = {
  US: 8, CA: 9, GB: 8, DE: 9, FR: 8, JP: 9, AU: 9, // Stable
  CN: 6, IN: 6, BR: 5, MX: 5, ID: 6, VN: 6,        // Moderate
  RU: 3, UA: 2, IR: 3, VE: 2, MM: 2, AF: 1,        // Unstable
  TW: 5, KR: 7, SG: 9, MY: 7, TH: 6, PH: 5,        // East Asia
  SA: 5, AE: 7, IL: 5, EG: 4, TR: 4, PK: 3,        // Middle East/South Asia
};

// Natural disaster risk by region (0-10)
const DISASTER_RISK: Record<string, number> = {
  JP: 8, TW: 7, PH: 8, ID: 8, // Pacific Ring of Fire
  US: 5, // Variable by region
  BD: 7, MM: 6, IN: 6, // Monsoon zones
  CN: 5, VN: 6, TH: 5,
  NL: 3, DE: 2, GB: 2, FR: 2, // Lower risk
  SG: 2, AE: 1, SA: 1,
};

// Chokepoints with coordinates
const CHOKEPOINTS = [
  { name: 'Strait of Malacca', lat: 1.4, lng: 103.8 },
  { name: 'Suez Canal', lat: 30.8, lng: 32.3 },
  { name: 'Panama Canal', lat: 9.1, lng: -79.7 },
  { name: 'Strait of Hormuz', lat: 26.5, lng: 56.3 },
  { name: 'Taiwan Strait', lat: 24.5, lng: 119.5 },
];

// ============================================================================
// SHAP Value Calculation
// ============================================================================

/**
 * Calculate SHAP-like contribution values for each feature
 * Uses a simplified version of SHAP that doesn't require full model retraining
 */
async function calculateFeatureContributions(
  entityId: string,
  entityType: 'company' | 'port' | 'country'
): Promise<FeatureContribution[]> {
  const contributions: FeatureContribution[] = [];
  const baselineRisk = 5; // Expected average risk

  // Get entity data from knowledge graph
  const entityData = await getEntityData(entityId, entityType);
  
  // Calculate contribution for each feature
  for (const [featureName, featureDef] of Object.entries(FEATURE_DEFINITIONS)) {
    const featureValue = await getFeatureValue(featureName, entityId, entityType, entityData);
    
    // Calculate SHAP-like contribution
    // contribution = (feature_value - baseline) * weight
    const baseline = getFeatureBaseline(featureName);
    const rawContribution = (featureValue - baseline) * featureDef.weight * 10;
    
    const direction = rawContribution > 0.1 ? 'increases' : 
                      rawContribution < -0.1 ? 'decreases' : 'neutral';
    
    contributions.push({
      feature: formatFeatureName(featureName),
      value: Math.round(featureValue * 100) / 100,
      contribution: Math.round(rawContribution * 100) / 100,
      importance: featureDef.weight,
      direction,
      explanation: generateFeatureExplanation(featureName, featureValue, direction, featureDef),
    });
  }

  return contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

/**
 * Get entity data from knowledge graph
 */
async function getEntityData(
  entityId: string,
  entityType: 'company' | 'port' | 'country'
): Promise<any> {
  if (!getDriver()) return {};

  try {
    const query = entityType === 'company'
      ? `
        MATCH (c:Company {id: $entityId})
        OPTIONAL MATCH (c)-[:LOCATED_IN]->(country:Country)
        OPTIONAL MATCH (c)-[:USES]->(port:Port)
        OPTIONAL MATCH (e:Event)-[:OCCURRED_IN]->(country)
        WHERE e.occurred_at >= datetime() - duration('P7D')
        RETURN c, country, collect(DISTINCT port) as ports, collect(DISTINCT e) as events
      `
      : entityType === 'port'
      ? `
        MATCH (p:Port {id: $entityId})
        OPTIONAL MATCH (p)-[:LOCATED_IN]->(country:Country)
        OPTIONAL MATCH (e:Event)-[:OCCURRED_IN]->(country)
        WHERE e.occurred_at >= datetime() - duration('P7D')
        RETURN p, country, collect(DISTINCT e) as events
      `
      : `
        MATCH (c:Country {code: $entityId})
        OPTIONAL MATCH (e:Event)-[:OCCURRED_IN]->(c)
        WHERE e.occurred_at >= datetime() - duration('P7D')
        RETURN c as country, collect(DISTINCT e) as events
      `;

    const result = await runQuery(query, { entityId });
    return result[0] || {};
  } catch (error) {
    console.error('Failed to get entity data:', error);
    return {};
  }
}

/**
 * Get specific feature value
 */
async function getFeatureValue(
  featureName: string,
  entityId: string,
  entityType: string,
  entityData: any
): Promise<number> {
  switch (featureName) {
    case 'geopolitical_stability': {
      const countryCode = entityData.country?.code || entityId;
      return (COUNTRY_STABILITY[countryCode] || 5) / 10;
    }
    
    case 'natural_disaster_risk': {
      const countryCode = entityData.country?.code || entityId;
      return (DISASTER_RISK[countryCode] || 5) / 10;
    }
    
    case 'distance_to_chokepoint': {
      if (!entityData.country) return 0.5;
      const lat = entityData.country.lat || 0;
      const lng = entityData.country.lng || 0;
      
      let minDist = Infinity;
      for (const cp of CHOKEPOINTS) {
        const dist = haversineDistance(lat, lng, cp.lat, cp.lng);
        minDist = Math.min(minDist, dist);
      }
      // Normalize: closer = higher value (more risk)
      return Math.max(0, Math.min(1, 1 - minDist / 10000));
    }
    
    case 'recent_event_count': {
      const events = entityData.events || [];
      return Math.min(1, events.length / 10); // Normalize to 0-1
    }
    
    case 'avg_event_severity': {
      const events = entityData.events || [];
      if (events.length === 0) return 0;
      const avg = events.reduce((sum: number, e: any) => sum + (e.severity || 5), 0) / events.length;
      return avg / 10;
    }
    
    case 'news_sentiment': {
      // Get recent news sentiment
      const { data: news } = await supabase
        .from('news')
        .select('title, description')
        .order('published_at', { ascending: false })
        .limit(5);
      
      if (!news || news.length === 0) return 0.5;
      
      let totalSentiment = 0;
      for (const article of news) {
        const result = await analyzeNewsSentiment(`${article.title} ${article.description || ''}`);
        totalSentiment += result.score;
      }
      // Convert from -1,1 to 0,1 (where 1 = negative/risky)
      return (1 - totalSentiment / news.length) / 2;
    }
    
    case 'supplier_concentration': {
      // Would come from supply chain data
      const ports = entityData.ports || [];
      if (ports.length === 0) return 0.5;
      // More ports = less concentration = lower risk
      return Math.max(0, 1 - ports.length / 10);
    }
    
    case 'port_congestion': {
      // Would integrate with maritime data
      return 0.4; // Placeholder
    }
    
    case 'route_complexity': {
      const ports = entityData.ports || [];
      return Math.min(1, ports.length / 5);
    }
    
    case 'tariff_exposure': {
      // Would integrate with tariff data
      return 0.3; // Placeholder
    }
    
    case 'currency_volatility': {
      return 0.3; // Placeholder
    }
    
    case 'seasonal_risk': {
      const month = new Date().getMonth();
      // Higher risk during monsoon (June-Sep) and winter (Dec-Feb)
      const seasonalFactors = [0.5, 0.4, 0.3, 0.3, 0.4, 0.6, 0.7, 0.7, 0.6, 0.4, 0.4, 0.5];
      return seasonalFactors[month];
    }
    
    default:
      return 0.5;
  }
}

/**
 * Get baseline value for a feature (expected average)
 */
function getFeatureBaseline(featureName: string): number {
  const baselines: Record<string, number> = {
    geopolitical_stability: 0.6,
    natural_disaster_risk: 0.4,
    distance_to_chokepoint: 0.5,
    recent_event_count: 0.2,
    avg_event_severity: 0.4,
    news_sentiment: 0.5,
    supplier_concentration: 0.5,
    port_congestion: 0.4,
    route_complexity: 0.3,
    tariff_exposure: 0.3,
    currency_volatility: 0.3,
    seasonal_risk: 0.4,
  };
  
  return baselines[featureName] || 0.5;
}

/**
 * Format feature name for display
 */
function formatFeatureName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate human-readable explanation for a feature
 */
function generateFeatureExplanation(
  featureName: string,
  value: number,
  direction: 'increases' | 'decreases' | 'neutral',
  featureDef: { description: string }
): string {
  const valueDesc = value > 0.7 ? 'high' : value > 0.4 ? 'moderate' : 'low';
  const impact = direction === 'increases' ? 'increases' : 
                 direction === 'decreases' ? 'decreases' : 'has minimal effect on';
  
  return `${formatFeatureName(featureName)} is ${valueDesc} (${(value * 100).toFixed(0)}%), which ${impact} risk. ${featureDef.description}.`;
}

/**
 * Calculate distance between two points
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================================
// Main Explainability Functions
// ============================================================================

/**
 * Generate comprehensive explanation for a risk score
 */
export async function explainRiskScore(
  entityId: string,
  entityType: 'company' | 'port' | 'country',
  riskScore: number
): Promise<RiskExplanation> {
  const baselineRisk = 5;
  const features = await calculateFeatureContributions(entityId, entityType);
  
  // Calculate explained risk from features
  const explainedDelta = features.reduce((sum, f) => sum + f.contribution, 0);
  const unexplainedDelta = riskScore - baselineRisk - explainedDelta;
  
  // Separate positive and negative contributors
  const riskFactors = features
    .filter(f => f.contribution > 0.1)
    .map(f => f.explanation);
  
  const protectiveFactors = features
    .filter(f => f.contribution < -0.1)
    .map(f => f.explanation);
  
  // Generate summary
  const summary = generateSummary(entityType, riskScore, features);
  
  // Calculate confidence (based on how much variance is explained)
  const totalVariance = Math.abs(riskScore - baselineRisk);
  const explainedVariance = Math.abs(explainedDelta);
  const confidence = totalVariance > 0 
    ? Math.min(1, explainedVariance / totalVariance)
    : 0.8;

  return {
    entityId,
    entityType,
    baseRisk: baselineRisk,
    finalRisk: riskScore,
    features,
    summary,
    topRiskFactors: riskFactors.slice(0, 3),
    topProtectiveFactors: protectiveFactors.slice(0, 3),
    confidenceScore: Math.round(confidence * 100) / 100,
    methodology: 'SHAP-inspired feature attribution analysis using knowledge graph data and real-time event signals',
  };
}

/**
 * Generate summary explanation
 */
function generateSummary(
  entityType: string,
  riskScore: number,
  features: FeatureContribution[]
): string {
  const riskLevel = riskScore >= 7 ? 'high' : riskScore >= 4 ? 'moderate' : 'low';
  
  const topContributors = features
    .filter(f => Math.abs(f.contribution) > 0.3)
    .slice(0, 3);
  
  const contributorText = topContributors.length > 0
    ? `Key factors include ${topContributors.map(f => f.feature.toLowerCase()).join(', ')}.`
    : 'No single factor dominates the risk assessment.';
  
  return `This ${entityType} has a ${riskLevel} risk score of ${riskScore.toFixed(1)}/10. ${contributorText}`;
}

/**
 * Get global feature importance rankings
 */
export function getGlobalFeatureImportance(): FeatureImportance[] {
  return Object.entries(FEATURE_DEFINITIONS)
    .map(([name, def]) => ({
      feature: formatFeatureName(name),
      globalImportance: def.weight,
      description: def.description,
    }))
    .sort((a, b) => b.globalImportance - a.globalImportance);
}

/**
 * Compare risk explanations between two entities
 */
export async function compareRiskExplanations(
  entity1: { id: string; type: 'company' | 'port' | 'country'; risk: number },
  entity2: { id: string; type: 'company' | 'port' | 'country'; risk: number }
): Promise<{
  entity1Explanation: RiskExplanation;
  entity2Explanation: RiskExplanation;
  keyDifferences: Array<{
    feature: string;
    entity1Value: number;
    entity2Value: number;
    difference: number;
  }>;
}> {
  const explanation1 = await explainRiskScore(entity1.id, entity1.type, entity1.risk);
  const explanation2 = await explainRiskScore(entity2.id, entity2.type, entity2.risk);
  
  // Find key differences
  const keyDifferences: Array<{
    feature: string;
    entity1Value: number;
    entity2Value: number;
    difference: number;
  }> = [];
  
  for (const f1 of explanation1.features) {
    const f2 = explanation2.features.find(f => f.feature === f1.feature);
    if (f2) {
      const diff = Math.abs(f1.contribution - f2.contribution);
      if (diff > 0.2) {
        keyDifferences.push({
          feature: f1.feature,
          entity1Value: f1.contribution,
          entity2Value: f2.contribution,
          difference: diff,
        });
      }
    }
  }
  
  return {
    entity1Explanation: explanation1,
    entity2Explanation: explanation2,
    keyDifferences: keyDifferences.sort((a, b) => b.difference - a.difference),
  };
}

/**
 * Generate "what-if" analysis
 * Shows how risk would change if a feature changes
 */
export async function whatIfAnalysis(
  entityId: string,
  entityType: 'company' | 'port' | 'country',
  currentRisk: number,
  featureChanges: Record<string, number>
): Promise<{
  currentRisk: number;
  projectedRisk: number;
  featureImpacts: Array<{
    feature: string;
    currentContribution: number;
    newContribution: number;
    riskDelta: number;
  }>;
}> {
  const currentFeatures = await calculateFeatureContributions(entityId, entityType);
  
  const featureImpacts: Array<{
    feature: string;
    currentContribution: number;
    newContribution: number;
    riskDelta: number;
  }> = [];
  
  let totalDelta = 0;
  
  for (const [featureName, newValue] of Object.entries(featureChanges)) {
    const currentFeature = currentFeatures.find(
      f => f.feature.toLowerCase().replace(/ /g, '_') === featureName.toLowerCase()
    );
    
    if (currentFeature) {
      const featureDef = FEATURE_DEFINITIONS[featureName.toLowerCase().replace(/ /g, '_')];
      if (featureDef) {
        const baseline = getFeatureBaseline(featureName.toLowerCase().replace(/ /g, '_'));
        const newContribution = (newValue - baseline) * featureDef.weight * 10;
        const riskDelta = newContribution - currentFeature.contribution;
        
        totalDelta += riskDelta;
        
        featureImpacts.push({
          feature: currentFeature.feature,
          currentContribution: currentFeature.contribution,
          newContribution: Math.round(newContribution * 100) / 100,
          riskDelta: Math.round(riskDelta * 100) / 100,
        });
      }
    }
  }
  
  return {
    currentRisk,
    projectedRisk: Math.max(0, Math.min(10, currentRisk + totalDelta)),
    featureImpacts,
  };
}
