// backend/src/services/mlRiskEngine.ts
// ML-Enhanced Risk Engine using NLP, embeddings, and time-series analysis

import OpenAI from 'openai';
import { supabase } from '../lib/supabase';
import { runQuery } from '../lib/neo4j';

// Initialize OpenAI client (optional - gracefully degrades if not configured)
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ============================================================================
// TYPES
// ============================================================================

export interface RiskAssessment {
  entityId: string;
  entityType: 'company' | 'port' | 'country';
  riskScore: number;
  confidence: number;
  factors: RiskFactor[];
  trend: 'increasing' | 'stable' | 'decreasing';
  predictedScore7d: number;
  aiAnalysis?: string;
}

export interface RiskFactor {
  name: string;
  weight: number;
  score: number;
  contribution: number;
  source: 'event' | 'news_sentiment' | 'historical' | 'geopolitical' | 'network';
}

export interface EventEmbedding {
  eventId: string;
  embedding: number[];
  severity: number;
  timestamp: Date;
}

export interface SentimentResult {
  score: number; // -1 to 1
  magnitude: number; // 0 to 1 (confidence)
  aspects: { topic: string; sentiment: number }[];
}

// ============================================================================
// SENTIMENT ANALYSIS (using OpenAI or fallback to keyword-based)
// ============================================================================

/**
 * Analyze sentiment of news/event text using LLM
 */
export async function analyzeNewsSentiment(text: string): Promise<SentimentResult> {
  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a supply chain risk analyst. Analyze the following text for sentiment and risk signals.
Return a JSON object with:
- score: number from -1 (very negative/high risk) to 1 (very positive/low risk)
- magnitude: confidence from 0 to 1
- aspects: array of {topic: string, sentiment: number} for specific risk areas (logistics, political, weather, labor, etc.)

Focus on supply chain disruption signals: delays, shortages, conflicts, natural disasters, strikes, policy changes.`
          },
          { role: 'user', content: text.slice(0, 2000) } // Limit text length
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return JSON.parse(content) as SentimentResult;
      }
    } catch (error) {
      console.error('OpenAI sentiment analysis failed, using fallback:', error);
    }
  }

  // Fallback: keyword-based sentiment analysis
  return keywordBasedSentiment(text);
}

/**
 * Fallback keyword-based sentiment analysis
 */
function keywordBasedSentiment(text: string): SentimentResult {
  const lowerText = text.toLowerCase();
  
  // Risk-indicating keywords with weights
  const negativeKeywords: Record<string, number> = {
    'disaster': -0.8, 'earthquake': -0.9, 'tsunami': -0.9, 'hurricane': -0.8,
    'flood': -0.7, 'fire': -0.6, 'explosion': -0.8, 'collapse': -0.7,
    'strike': -0.5, 'protest': -0.4, 'blockade': -0.7, 'embargo': -0.8,
    'shortage': -0.6, 'delay': -0.4, 'disruption': -0.6, 'closure': -0.5,
    'war': -0.9, 'conflict': -0.7, 'sanctions': -0.6, 'tariff': -0.4,
    'bankruptcy': -0.7, 'default': -0.6, 'crisis': -0.6, 'emergency': -0.5,
    'contamination': -0.7, 'recall': -0.5, 'failure': -0.5, 'outage': -0.5,
    'cyberattack': -0.7, 'hack': -0.6, 'breach': -0.5,
  };

  const positiveKeywords: Record<string, number> = {
    'recovery': 0.5, 'resolved': 0.6, 'restored': 0.5, 'reopened': 0.6,
    'agreement': 0.4, 'deal': 0.3, 'partnership': 0.4, 'investment': 0.3,
    'growth': 0.3, 'expansion': 0.3, 'improvement': 0.4, 'stable': 0.3,
  };

  let totalScore = 0;
  let matchCount = 0;
  const aspects: { topic: string; sentiment: number }[] = [];

  // Check negative keywords
  for (const [keyword, weight] of Object.entries(negativeKeywords)) {
    if (lowerText.includes(keyword)) {
      totalScore += weight;
      matchCount++;
      aspects.push({ topic: keyword, sentiment: weight });
    }
  }

  // Check positive keywords
  for (const [keyword, weight] of Object.entries(positiveKeywords)) {
    if (lowerText.includes(keyword)) {
      totalScore += weight;
      matchCount++;
      aspects.push({ topic: keyword, sentiment: weight });
    }
  }

  // Calculate average score
  const score = matchCount > 0 ? Math.max(-1, Math.min(1, totalScore / matchCount)) : 0;
  const magnitude = Math.min(1, matchCount * 0.15); // More keywords = higher confidence

  return { score, magnitude, aspects: aspects.slice(0, 5) };
}

// ============================================================================
// EMBEDDING-BASED SIMILARITY (for finding similar historical events)
// ============================================================================

/**
 * Generate embedding for text using OpenAI or simple TF-IDF fallback
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (openai) {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000),
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embedding failed, using fallback:', error);
    }
  }

  // Fallback: simple TF-IDF-like embedding
  return simpleTfIdfEmbedding(text);
}

/**
 * Simple TF-IDF-like embedding (128 dimensions based on keyword categories)
 */
function simpleTfIdfEmbedding(text: string): number[] {
  const lowerText = text.toLowerCase();
  
  // Define 128 keyword categories for consistent dimensionality
  const categories = [
    // Natural disasters (0-15)
    ['earthquake', 'seismic', 'quake', 'tremor'],
    ['tsunami', 'tidal', 'wave'],
    ['hurricane', 'typhoon', 'cyclone', 'storm'],
    ['flood', 'flooding', 'deluge', 'inundation'],
    ['drought', 'dry', 'water shortage'],
    ['wildfire', 'fire', 'blaze', 'burn'],
    ['tornado', 'twister', 'wind'],
    ['volcano', 'eruption', 'lava', 'ash'],
    ['landslide', 'mudslide', 'avalanche'],
    ['heatwave', 'heat', 'temperature'],
    ['cold', 'freeze', 'frost', 'snow'],
    ['lightning', 'thunder'],
    ['hail', 'ice'],
    ['fog', 'visibility'],
    ['sandstorm', 'dust'],
    ['sinkhole', 'subsidence'],
    
    // Geopolitical (16-31)
    ['war', 'warfare', 'military', 'invasion'],
    ['conflict', 'battle', 'fighting'],
    ['sanctions', 'embargo', 'restriction'],
    ['tariff', 'duty', 'trade war'],
    ['election', 'vote', 'political'],
    ['coup', 'overthrow', 'revolution'],
    ['protest', 'demonstration', 'riot'],
    ['terrorism', 'attack', 'bomb'],
    ['refugee', 'migration', 'displacement'],
    ['treaty', 'agreement', 'deal'],
    ['diplomacy', 'negotiation', 'talks'],
    ['alliance', 'partnership', 'coalition'],
    ['independence', 'secession', 'separation'],
    ['annexation', 'occupation', 'territory'],
    ['ceasefire', 'peace', 'armistice'],
    ['mobilization', 'conscription', 'draft'],
    
    // Economic (32-47)
    ['recession', 'depression', 'downturn'],
    ['inflation', 'price', 'cost'],
    ['currency', 'exchange', 'devaluation'],
    ['bankruptcy', 'insolvency', 'default'],
    ['stock', 'market', 'crash'],
    ['unemployment', 'layoff', 'job loss'],
    ['growth', 'gdp', 'expansion'],
    ['investment', 'funding', 'capital'],
    ['debt', 'loan', 'credit'],
    ['interest', 'rate', 'monetary'],
    ['subsidy', 'stimulus', 'relief'],
    ['export', 'import', 'trade'],
    ['deficit', 'surplus', 'balance'],
    ['commodity', 'raw material', 'resource'],
    ['shortage', 'scarcity', 'supply'],
    ['surplus', 'oversupply', 'glut'],
    
    // Labor (48-55)
    ['strike', 'walkout', 'stoppage'],
    ['union', 'labor', 'worker'],
    ['wage', 'salary', 'pay'],
    ['hiring', 'recruitment', 'employment'],
    ['retirement', 'pension', 'benefit'],
    ['safety', 'accident', 'injury'],
    ['training', 'skill', 'education'],
    ['automation', 'robot', 'ai'],
    
    // Infrastructure (56-71)
    ['port', 'harbor', 'dock'],
    ['airport', 'aviation', 'flight'],
    ['railway', 'train', 'rail'],
    ['highway', 'road', 'traffic'],
    ['bridge', 'tunnel', 'crossing'],
    ['pipeline', 'transmission', 'grid'],
    ['power', 'electricity', 'energy'],
    ['internet', 'network', 'telecom'],
    ['water', 'sewage', 'utility'],
    ['warehouse', 'storage', 'distribution'],
    ['construction', 'building', 'development'],
    ['maintenance', 'repair', 'upgrade'],
    ['capacity', 'congestion', 'bottleneck'],
    ['expansion', 'extension', 'addition'],
    ['closure', 'shutdown', 'offline'],
    ['delay', 'backlog', 'waiting'],
    
    // Health/Safety (72-87)
    ['pandemic', 'epidemic', 'outbreak'],
    ['virus', 'disease', 'infection'],
    ['quarantine', 'lockdown', 'isolation'],
    ['vaccine', 'treatment', 'medicine'],
    ['hospital', 'healthcare', 'medical'],
    ['contamination', 'pollution', 'toxic'],
    ['recall', 'defect', 'quality'],
    ['inspection', 'compliance', 'regulation'],
    ['certification', 'standard', 'audit'],
    ['hazard', 'danger', 'risk'],
    ['emergency', 'crisis', 'disaster'],
    ['recovery', 'restoration', 'rebuilding'],
    ['insurance', 'claim', 'coverage'],
    ['liability', 'lawsuit', 'legal'],
    ['fine', 'penalty', 'violation'],
    ['ban', 'prohibition', 'restriction'],
    
    // Technology (88-95)
    ['cyberattack', 'hack', 'breach'],
    ['malware', 'ransomware', 'virus'],
    ['outage', 'downtime', 'failure'],
    ['software', 'system', 'platform'],
    ['data', 'information', 'privacy'],
    ['blockchain', 'crypto', 'digital'],
    ['iot', 'sensor', 'tracking'],
    ['cloud', 'server', 'computing'],
    
    // Shipping/Logistics (96-111)
    ['shipping', 'freight', 'cargo'],
    ['container', 'vessel', 'ship'],
    ['trucking', 'transport', 'delivery'],
    ['customs', 'border', 'clearance'],
    ['warehouse', 'inventory', 'stock'],
    ['route', 'lane', 'corridor'],
    ['charter', 'lease', 'contract'],
    ['carrier', 'logistics', '3pl'],
    ['tracking', 'visibility', 'monitoring'],
    ['packaging', 'handling', 'loading'],
    ['insurance', 'liability', 'coverage'],
    ['documentation', 'paperwork', 'permit'],
    ['perishable', 'cold chain', 'temperature'],
    ['hazmat', 'dangerous', 'regulated'],
    ['express', 'expedited', 'urgent'],
    ['bulk', 'volume', 'mass'],
    
    // Industry specific (112-127)
    ['semiconductor', 'chip', 'electronics'],
    ['automotive', 'vehicle', 'car'],
    ['pharmaceutical', 'drug', 'biotech'],
    ['agriculture', 'farming', 'crop'],
    ['textile', 'clothing', 'fashion'],
    ['steel', 'metal', 'mining'],
    ['oil', 'gas', 'petroleum'],
    ['chemical', 'plastic', 'polymer'],
    ['food', 'beverage', 'consumer'],
    ['aerospace', 'defense', 'military'],
    ['construction', 'material', 'cement'],
    ['paper', 'packaging', 'forestry'],
    ['retail', 'ecommerce', 'consumer'],
    ['luxury', 'premium', 'brand'],
    ['battery', 'ev', 'renewable'],
    ['rare earth', 'mineral', 'critical'],
  ];

  // Generate embedding based on keyword presence and frequency
  const embedding: number[] = [];
  
  for (const category of categories) {
    let score = 0;
    for (const keyword of category) {
      const regex = new RegExp(keyword, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        score += matches.length * 0.3;
      }
    }
    // Normalize to 0-1 range with tanh
    embedding.push(Math.tanh(score));
  }

  return embedding;
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Find similar historical events based on embedding similarity
 */
export async function findSimilarHistoricalEvents(
  currentEvent: { title: string; description?: string },
  limit: number = 5
): Promise<Array<{ eventId: string; similarity: number; severity: number; title: string }>> {
  const currentText = `${currentEvent.title} ${currentEvent.description || ''}`;
  const currentEmbedding = await generateEmbedding(currentText);

  // Get historical events from the database
  const { data: events } = await supabase
    .from('events')
    .select('id, title, description, severity, occurred_at')
    .order('occurred_at', { ascending: false })
    .limit(200);

  if (!events || events.length === 0) return [];

  // Calculate similarities
  const similarities: Array<{ eventId: string; similarity: number; severity: number; title: string }> = [];
  
  for (const event of events) {
    const eventText = `${event.title} ${event.description || ''}`;
    const eventEmbedding = await generateEmbedding(eventText);
    const similarity = cosineSimilarity(currentEmbedding, eventEmbedding);
    
    similarities.push({
      eventId: event.id,
      similarity,
      severity: event.severity || 5,
      title: event.title,
    });
  }

  // Sort by similarity and return top matches
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

// ============================================================================
// TIME-SERIES FORECASTING (Exponential Smoothing)
// ============================================================================

/**
 * Get historical risk scores for an entity
 */
async function getHistoricalRiskScores(
  entityId: string,
  entityType: string,
  days: number = 30
): Promise<Array<{ date: Date; score: number }>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get events affecting this entity over time
  const query = entityType === 'company'
    ? `
      MATCH (c:Company {id: $entityId})-[:LOCATED_IN]->(country:Country)
      MATCH (e:Event)-[:OCCURRED_IN]->(country)
      WHERE e.occurred_at >= $startDate
      RETURN e.occurred_at as date, e.severity as severity
      ORDER BY e.occurred_at
    `
    : entityType === 'port'
    ? `
      MATCH (p:Port {id: $entityId})-[:LOCATED_IN]->(country:Country)
      MATCH (e:Event)-[:OCCURRED_IN]->(country)
      WHERE e.occurred_at >= $startDate
      RETURN e.occurred_at as date, e.severity as severity
      ORDER BY e.occurred_at
    `
    : `
      MATCH (e:Event)-[:OCCURRED_IN]->(c:Country {code: $entityId})
      WHERE e.occurred_at >= $startDate
      RETURN e.occurred_at as date, e.severity as severity
      ORDER BY e.occurred_at
    `;

  try {
    const result = await runQuery(query, { entityId, startDate: startDate.toISOString() });
    
    // Aggregate by day
    const dailyScores: Map<string, number[]> = new Map();
    
    for (const record of result) {
      const date = new Date(record.date);
      const dateKey = date.toISOString().split('T')[0];
      const scores = dailyScores.get(dateKey) || [];
      scores.push(record.severity || 5);
      dailyScores.set(dateKey, scores);
    }

    // Convert to array with average daily scores
    const scores: Array<{ date: Date; score: number }> = [];
    dailyScores.forEach((values, dateKey) => {
      const avgScore = values.reduce((a, b) => a + b, 0) / values.length;
      scores.push({ date: new Date(dateKey), score: avgScore });
    });

    return scores.sort((a, b) => a.date.getTime() - b.date.getTime());
  } catch (error) {
    console.error('Failed to get historical risk scores:', error);
    return [];
  }
}

/**
 * Exponential smoothing forecast
 */
function exponentialSmoothing(
  data: number[],
  alpha: number = 0.3, // Smoothing factor
  forecastPeriods: number = 7
): { smoothed: number[]; forecast: number[]; trend: 'increasing' | 'stable' | 'decreasing' } {
  if (data.length === 0) {
    return { smoothed: [], forecast: Array(forecastPeriods).fill(5), trend: 'stable' };
  }

  // Simple exponential smoothing
  const smoothed: number[] = [data[0]];
  
  for (let i = 1; i < data.length; i++) {
    smoothed.push(alpha * data[i] + (1 - alpha) * smoothed[i - 1]);
  }

  // Calculate trend using last few points
  const recentWindow = smoothed.slice(-7);
  let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
  
  if (recentWindow.length >= 3) {
    const firstHalf = recentWindow.slice(0, Math.floor(recentWindow.length / 2));
    const secondHalf = recentWindow.slice(Math.floor(recentWindow.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change > 0.1) trend = 'increasing';
    else if (change < -0.1) trend = 'decreasing';
  }

  // Forecast using double exponential smoothing (Holt's method)
  const beta = 0.1; // Trend smoothing factor
  const lastValue = smoothed[smoothed.length - 1];
  
  // Calculate level and trend
  let level = lastValue;
  let trendValue = smoothed.length > 1 
    ? smoothed[smoothed.length - 1] - smoothed[smoothed.length - 2]
    : 0;

  const forecast: number[] = [];
  for (let i = 1; i <= forecastPeriods; i++) {
    const forecastValue = level + i * trendValue;
    forecast.push(Math.max(0, Math.min(10, forecastValue))); // Clamp to 0-10
  }

  return { smoothed, forecast, trend };
}

// ============================================================================
// NETWORK ANALYSIS (supply chain graph analysis)
// ============================================================================

/**
 * Calculate network-based risk propagation
 * Risk spreads through the supply chain network
 */
export async function calculateNetworkRisk(companyId: string): Promise<{
  directRisk: number;
  propagatedRisk: number;
  criticalPaths: Array<{ path: string[]; riskContribution: number }>;
}> {
  try {
    // Get company's supply chain network (2 hops)
    const query = `
      MATCH (c:Company {id: $companyId})
      OPTIONAL MATCH (c)-[:USES]->(p:Port)
      OPTIONAL MATCH (p)-[:LOCATED_IN]->(portCountry:Country)
      OPTIONAL MATCH (c)-[:LOCATED_IN]->(companyCountry:Country)
      OPTIONAL MATCH (e:Event)-[:OCCURRED_IN]->(portCountry)
      WHERE e.occurred_at >= datetime() - duration('P7D')
      WITH c, collect(DISTINCT {
        port: p.name,
        country: portCountry.name,
        countryCode: portCountry.code,
        events: collect(DISTINCT {severity: e.severity, title: e.title})
      }) as portData
      RETURN portData
    `;

    const result = await runQuery(query, { companyId });
    
    if (!result || result.length === 0) {
      return { directRisk: 0, propagatedRisk: 0, criticalPaths: [] };
    }

    const portData = result[0]?.portData || [];
    
    // Calculate direct risk (company's own location)
    let directRisk = 0;
    
    // Calculate propagated risk (from supply chain)
    let propagatedRisk = 0;
    const criticalPaths: Array<{ path: string[]; riskContribution: number }> = [];
    
    for (const port of portData) {
      if (!port.events) continue;
      
      let portRisk = 0;
      for (const event of port.events) {
        if (event.severity) {
          portRisk = Math.max(portRisk, event.severity);
        }
      }
      
      if (portRisk > 0) {
        // Risk attenuates through the network (0.7 factor per hop)
        const contribution = portRisk * 0.7;
        propagatedRisk = Math.max(propagatedRisk, contribution);
        
        if (contribution > 3) {
          criticalPaths.push({
            path: [port.port, port.country],
            riskContribution: contribution,
          });
        }
      }
    }

    return {
      directRisk,
      propagatedRisk,
      criticalPaths: criticalPaths.sort((a, b) => b.riskContribution - a.riskContribution).slice(0, 5),
    };
  } catch (error) {
    console.error('Network risk calculation failed:', error);
    return { directRisk: 0, propagatedRisk: 0, criticalPaths: [] };
  }
}

// ============================================================================
// MAIN ML RISK ASSESSMENT
// ============================================================================

/**
 * Perform comprehensive ML-based risk assessment
 */
export async function assessRiskML(
  entityId: string,
  entityType: 'company' | 'port' | 'country'
): Promise<RiskAssessment> {
  const factors: RiskFactor[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  // 1. Get recent events and analyze sentiment
  const { data: recentEvents } = await supabase
    .from('events')
    .select('*')
    .order('occurred_at', { ascending: false })
    .limit(20);

  let eventSentimentScore = 0;
  let eventCount = 0;
  
  if (recentEvents) {
    for (const event of recentEvents) {
      const text = `${event.title} ${event.description || ''}`;
      const sentiment = await analyzeNewsSentiment(text);
      
      // Convert sentiment to risk (negative sentiment = higher risk)
      const eventRisk = (1 - sentiment.score) * 5; // 0-10 scale
      eventSentimentScore += eventRisk * sentiment.magnitude;
      eventCount++;
    }
  }

  if (eventCount > 0) {
    const avgSentimentRisk = eventSentimentScore / eventCount;
    factors.push({
      name: 'News Sentiment Analysis',
      weight: 0.25,
      score: avgSentimentRisk,
      contribution: avgSentimentRisk * 0.25,
      source: 'news_sentiment',
    });
    totalScore += avgSentimentRisk * 0.25;
    totalWeight += 0.25;
  }

  // 2. Historical pattern matching
  if (recentEvents && recentEvents.length > 0) {
    const latestEvent = recentEvents[0];
    const similarEvents = await findSimilarHistoricalEvents({
      title: latestEvent.title,
      description: latestEvent.description,
    });

    if (similarEvents.length > 0) {
      // Use severity of similar historical events as predictor
      const avgHistoricalSeverity = similarEvents.reduce((sum, e) => sum + e.severity, 0) / similarEvents.length;
      const weightedSimilarity = similarEvents.reduce((sum, e) => sum + e.severity * e.similarity, 0) / 
                                 similarEvents.reduce((sum, e) => sum + e.similarity, 0);

      factors.push({
        name: 'Historical Pattern Matching',
        weight: 0.2,
        score: weightedSimilarity,
        contribution: weightedSimilarity * 0.2,
        source: 'historical',
      });
      totalScore += weightedSimilarity * 0.2;
      totalWeight += 0.2;
    }
  }

  // 3. Time-series forecasting
  const historicalScores = await getHistoricalRiskScores(entityId, entityType, 30);
  const scores = historicalScores.map(h => h.score);
  const { forecast, trend } = exponentialSmoothing(scores);
  const predictedScore7d = forecast.length > 0 ? forecast[forecast.length - 1] : 5;

  if (scores.length > 0) {
    const currentTrendScore = scores[scores.length - 1] || 5;
    factors.push({
      name: 'Time-Series Trend',
      weight: 0.15,
      score: currentTrendScore,
      contribution: currentTrendScore * 0.15,
      source: 'historical',
    });
    totalScore += currentTrendScore * 0.15;
    totalWeight += 0.15;
  }

  // 4. Network propagation risk (for companies)
  if (entityType === 'company') {
    const networkRisk = await calculateNetworkRisk(entityId);
    const combinedNetworkRisk = Math.max(networkRisk.directRisk, networkRisk.propagatedRisk);
    
    if (combinedNetworkRisk > 0) {
      factors.push({
        name: 'Supply Chain Network Risk',
        weight: 0.25,
        score: combinedNetworkRisk,
        contribution: combinedNetworkRisk * 0.25,
        source: 'network',
      });
      totalScore += combinedNetworkRisk * 0.25;
      totalWeight += 0.25;
    }
  }

  // 5. Direct event risk (from knowledge graph)
  try {
    const eventQuery = entityType === 'company'
      ? `
        MATCH (c:Company {id: $entityId})-[:LOCATED_IN]->(country:Country)
        MATCH (e:Event)-[:OCCURRED_IN]->(country)
        WHERE e.occurred_at >= datetime() - duration('P7D')
        RETURN avg(e.severity) as avgSeverity, count(e) as eventCount
      `
      : entityType === 'port'
      ? `
        MATCH (p:Port {id: $entityId})-[:LOCATED_IN]->(country:Country)
        MATCH (e:Event)-[:OCCURRED_IN]->(country)
        WHERE e.occurred_at >= datetime() - duration('P7D')
        RETURN avg(e.severity) as avgSeverity, count(e) as eventCount
      `
      : `
        MATCH (e:Event)-[:OCCURRED_IN]->(c:Country {code: $entityId})
        WHERE e.occurred_at >= datetime() - duration('P7D')
        RETURN avg(e.severity) as avgSeverity, count(e) as eventCount
      `;

    const eventResult = await runQuery(eventQuery, { entityId });
    
    if (eventResult.length > 0 && eventResult[0].avgSeverity) {
      const eventRisk = eventResult[0].avgSeverity;
      factors.push({
        name: 'Direct Event Exposure',
        weight: 0.15,
        score: eventRisk,
        contribution: eventRisk * 0.15,
        source: 'event',
      });
      totalScore += eventRisk * 0.15;
      totalWeight += 0.15;
    }
  } catch (error) {
    console.error('Failed to get event risk:', error);
  }

  // Calculate final score
  const riskScore = totalWeight > 0 ? totalScore / totalWeight * 10 : 5;
  const confidence = Math.min(1, totalWeight / 0.8); // Max confidence at 80% weight coverage

  // Generate AI analysis if available
  let aiAnalysis: string | undefined;
  if (openai && factors.length > 0) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a supply chain risk analyst. Provide a brief 2-3 sentence analysis of the risk factors.',
          },
          {
            role: 'user',
            content: `Risk factors for ${entityType} ${entityId}:\n${factors.map(f => `- ${f.name}: ${f.score.toFixed(1)}/10 (${f.source})`).join('\n')}\n\nOverall trend: ${trend}`,
          },
        ],
        max_tokens: 150,
      });
      aiAnalysis = response.choices[0]?.message?.content || undefined;
    } catch (error) {
      console.error('AI analysis failed:', error);
    }
  }

  return {
    entityId,
    entityType,
    riskScore: Math.round(riskScore * 10) / 10,
    confidence: Math.round(confidence * 100) / 100,
    factors,
    trend,
    predictedScore7d: Math.round(predictedScore7d * 10) / 10,
    aiAnalysis,
  };
}

/**
 * Batch assess multiple entities
 */
export async function batchAssessRisk(
  entities: Array<{ id: string; type: 'company' | 'port' | 'country' }>
): Promise<RiskAssessment[]> {
  const results: RiskAssessment[] = [];
  
  for (const entity of entities) {
    const assessment = await assessRiskML(entity.id, entity.type);
    results.push(assessment);
  }
  
  return results;
}
