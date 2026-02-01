// backend/src/services/llmService.ts
// Unified LLM Service with OpenAI → Local HuggingFace Transformers fallback
// Uses @huggingface/transformers for local model inference (no API calls needed)

import OpenAI from 'openai';

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Local model settings (using transformers.js - runs entirely locally)
const LOCAL_EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2'; // ~23MB, runs locally

// State tracking
let useLocalModel = false;
let openaiFailureCount = 0;
const MAX_OPENAI_FAILURES = 2;

// Local model instances (lazy loaded)
let embeddingPipeline: any = null;
let transformersModule: any = null;

// Initialize OpenAI client
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  text: string;
  provider: 'openai' | 'local' | 'rule-based';
  model: string;
  tokensUsed?: number;
}

export interface EmbeddingResponse {
  embedding: number[];
  provider: 'openai' | 'local';
  model: string;
  dimensions: number;
}

/**
 * Lazy load the transformers module
 */
async function getTransformers() {
  if (!transformersModule) {
    try {
      // Dynamic import for ESM module
      transformersModule = await import('@huggingface/transformers');
      console.log('[LLM Service] ✅ HuggingFace Transformers loaded (local inference)');
    } catch (err) {
      console.warn('[LLM Service] ⚠️ @huggingface/transformers not available, using TF-IDF fallback');
      transformersModule = null;
    }
  }
  return transformersModule;
}

/**
 * Initialize local embedding pipeline
 */
async function getEmbeddingPipeline() {
  if (embeddingPipeline) return embeddingPipeline;
  
  const transformers = await getTransformers();
  if (!transformers) return null;
  
  try {
    console.log('[LLM Service] Loading local embedding model...');
    embeddingPipeline = await transformers.pipeline(
      'feature-extraction',
      LOCAL_EMBEDDING_MODEL,
      { dtype: 'fp32' }
    );
    console.log('[LLM Service] ✅ Local embedding model loaded:', LOCAL_EMBEDDING_MODEL);
    return embeddingPipeline;
  } catch (err: any) {
    console.error('[LLM Service] Failed to load embedding model:', err.message);
    return null;
  }
}

/**
 * Get current LLM provider status
 */
export function getLLMStatus() {
  return {
    chat: {
      provider: useLocalModel ? 'local' : 'openai',
      model: useLocalModel ? 'rule-based' : 'gpt-4o-mini',
      openaiFailures: openaiFailureCount,
    },
    embeddings: {
      provider: embeddingPipeline ? 'local' : 'tfidf',
      model: embeddingPipeline ? LOCAL_EMBEDDING_MODEL : 'tfidf-128d',
    },
    openaiAvailable: !!openai,
    localModelsAvailable: !!transformersModule,
  };
}

/**
 * Force switch to local model (for testing or manual override)
 */
export function switchToLocalModel() {
  useLocalModel = true;
  console.log('[LLM Service] Switched to local model');
}

/**
 * Alias for backwards compatibility
 */
export const switchToHuggingFace = switchToLocalModel;

/**
 * Reset to try OpenAI again
 */
export function resetToOpenAI() {
  useLocalModel = false;
  openaiFailureCount = 0;
  console.log('[LLM Service] Reset to OpenAI');
}

/**
 * Local rule-based fallback for when no LLM is available
 * Handles common supply chain analysis tasks without external API calls
 */
function localRuleBasedResponse(request: LLMRequest): LLMResponse {
  const prompt = (request.prompt + ' ' + (request.systemPrompt || '')).toLowerCase();
  let text = '';

  // Sentiment analysis
  if (prompt.includes('sentiment') || (prompt.includes('analyze') && prompt.includes('news'))) {
    const positiveWords = ['growth', 'success', 'increase', 'positive', 'gain', 'profit', 'improve', 'stable', 'recovery', 'expansion'];
    const negativeWords = ['risk', 'threat', 'decline', 'loss', 'crisis', 'disruption', 'conflict', 'warning', 'shortage', 'delay', 'attack', 'sanction', 'embargo'];
    
    const positiveCount = positiveWords.filter(w => prompt.includes(w)).length;
    const negativeCount = negativeWords.filter(w => prompt.includes(w)).length;
    
    const sentiment = negativeCount > positiveCount ? -0.5 : positiveCount > negativeCount ? 0.5 : 0;
    text = JSON.stringify({ 
      sentiment, 
      impact: negativeCount > 0 ? 'Potential supply chain impact detected' : 'No significant impact detected',
      confidence: 0.6 
    });
  }
  // Risk explanation
  else if (prompt.includes('explain') && prompt.includes('risk')) {
    const riskMatch = prompt.match(/risk score of (\d+)/);
    const score = riskMatch ? parseInt(riskMatch[1]) : 50;
    
    if (score >= 70) {
      text = 'This entity shows critical risk levels requiring immediate attention. Key factors include geopolitical exposure and supply chain concentration. Recommend activating contingency plans and diversifying suppliers.';
    } else if (score >= 40) {
      text = 'Moderate risk detected. Monitor situation closely and ensure backup options are ready. Consider building additional buffer stock for critical materials.';
    } else {
      text = 'Risk levels are within acceptable parameters. Continue standard monitoring and maintain current supplier relationships.';
    }
  }
  // Mitigation recommendations
  else if (prompt.includes('mitigation') || prompt.includes('recommend')) {
    text = `1. Diversify supplier base across multiple regions
2. Build strategic safety stock for critical components
3. Establish pre-qualified backup suppliers
4. Implement real-time supply chain monitoring
5. Review and update business continuity plans`;
  }
  // Default response
  else {
    text = 'Analysis completed. For detailed AI-powered insights, ensure OpenAI API key is configured.';
  }

  return {
    text,
    provider: 'rule-based',
    model: 'rule-based-v1',
  };
}

/**
 * Call OpenAI API
 */
async function callOpenAI(request: LLMRequest): Promise<LLMResponse> {
  if (!openai) {
    throw new Error('OpenAI not configured');
  }

  const messages: OpenAI.ChatCompletionMessageParam[] = [];
  
  if (request.systemPrompt) {
    messages.push({ role: 'system', content: request.systemPrompt });
  }
  messages.push({ role: 'user', content: request.prompt });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: request.maxTokens || 500,
    temperature: request.temperature || 0.7,
  });

  return {
    text: completion.choices[0]?.message?.content || '',
    provider: 'openai',
    model: 'gpt-4o-mini',
    tokensUsed: completion.usage?.total_tokens,
  };
}

/**
 * Main LLM completion function with automatic fallback
 * Priority: OpenAI → Rule-based
 */
export async function complete(request: LLMRequest): Promise<LLMResponse> {
  // If we've already switched to local model, use it directly
  if (useLocalModel) {
    return localRuleBasedResponse(request);
  }

  // Try OpenAI first
  if (openai) {
    try {
      const response = await callOpenAI(request);
      // Reset failure count on success
      openaiFailureCount = 0;
      return response;
    } catch (err: any) {
      openaiFailureCount++;
      console.warn(`[LLM Service] OpenAI failed (${openaiFailureCount}/${MAX_OPENAI_FAILURES}):`, err.message);

      // If exceeded max failures, switch to local model permanently
      if (openaiFailureCount >= MAX_OPENAI_FAILURES) {
        console.log('[LLM Service] ⚠️ Switching to local model due to repeated OpenAI failures');
        useLocalModel = true;
      }
    }
  }

  // Fallback to local rule-based
  return localRuleBasedResponse(request);
}

// ============================================================================
// EMBEDDING FUNCTIONS
// ============================================================================

/**
 * Generate embedding using local HuggingFace model (no API calls)
 */
async function generateLocalEmbedding(text: string): Promise<number[]> {
  const pipeline = await getEmbeddingPipeline();
  if (!pipeline) {
    throw new Error('Local embedding pipeline not available');
  }

  const output = await pipeline(text.slice(0, 512), { pooling: 'mean', normalize: true });
  
  // Convert to regular array
  return Array.from(output.data as Float32Array);
}

/**
 * Call OpenAI embedding API
 */
async function callOpenAIEmbedding(text: string): Promise<number[]> {
  if (!openai) {
    throw new Error('OpenAI not configured');
  }

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),
  });

  return response.data[0].embedding;
}

/**
 * Generate embedding - tries local model first, then TF-IDF fallback
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Try local HuggingFace model first (no API calls)
  try {
    const embedding = await generateLocalEmbedding(text);
    return embedding;
  } catch (err: any) {
    // Silent fallback to TF-IDF
  }

  // Fallback to TF-IDF
  return simpleTfIdfEmbedding(text);
}

/**
 * Simple TF-IDF-like embedding fallback (128 dimensions)
 */
function simpleTfIdfEmbedding(text: string): number[] {
  const lowerText = text.toLowerCase();
  
  // 128 keyword categories for consistent dimensionality
  const categories = [
    // Natural disasters (0-15)
    ['earthquake', 'seismic', 'tremor'], ['tsunami', 'tidal'], ['hurricane', 'cyclone', 'typhoon'],
    ['flood', 'flooding'], ['wildfire', 'fire'], ['volcano', 'eruption'], ['tornado', 'twister'],
    ['drought'], ['landslide', 'mudslide'], ['storm', 'tempest'], ['blizzard', 'snowstorm'],
    ['heatwave'], ['avalanche'], ['sinkhole'], ['lightning'], ['hail'],
    // Conflict (16-31)
    ['war', 'warfare'], ['conflict', 'battle'], ['attack', 'assault'], ['terrorism', 'terror'],
    ['military', 'army'], ['missile', 'rocket'], ['bomb', 'bombing'], ['invasion'],
    ['siege'], ['coup'], ['rebellion', 'revolt'], ['protest', 'demonstration'],
    ['riot'], ['strike', 'walkout'], ['violence'], ['hostage'],
    // Political (32-47)
    ['sanction', 'embargo'], ['tariff', 'duty'], ['election'], ['government'],
    ['policy', 'regulation'], ['treaty', 'agreement'], ['diplomat'], ['minister'],
    ['president', 'leader'], ['parliament', 'congress'], ['legislation', 'law'], ['ban', 'prohibition'],
    ['restriction'], ['trade war'], ['nationalist'], ['border'],
    // Economic (48-63)
    ['inflation'], ['recession'], ['bankruptcy'], ['default'],
    ['currency', 'forex'], ['stock', 'market'], ['price', 'cost'], ['shortage'],
    ['supply'], ['demand'], ['import'], ['export'],
    ['investment'], ['debt'], ['interest rate'], ['gdp'],
    // Logistics (64-79)
    ['shipping', 'freight'], ['port', 'harbor'], ['container'], ['cargo'],
    ['delay', 'delayed'], ['congestion'], ['backlog'], ['warehouse'],
    ['transport', 'transportation'], ['route', 'routing'], ['customs'], ['delivery'],
    ['truck', 'trucking'], ['rail', 'railway'], ['air freight'], ['maritime'],
    // Health (80-95)
    ['pandemic', 'epidemic'], ['virus', 'viral'], ['outbreak'], ['quarantine'],
    ['lockdown'], ['vaccine'], ['infection'], ['disease'],
    ['hospital'], ['medical'], ['health'], ['contamination'],
    ['recall'], ['safety'], ['hazard'], ['toxic'],
    // Technology (96-111)
    ['cyber', 'hack'], ['data breach'], ['ransomware'], ['outage'],
    ['system failure'], ['software'], ['network'], ['internet'],
    ['cloud'], ['server'], ['power outage'], ['blackout'],
    ['automation'], ['ai', 'artificial intelligence'], ['digital'], ['technology'],
    // General risk (112-127)
    ['risk', 'risky'], ['danger', 'dangerous'], ['threat'], ['crisis'],
    ['emergency'], ['disaster'], ['catastrophe'], ['severe'],
    ['critical'], ['urgent'], ['warning'], ['alert'],
    ['disruption'], ['impact'], ['damage'], ['loss'],
  ];

  const embedding = categories.map(keywords => {
    let score = 0;
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        score += matches.length * (1 / keywords.length);
      }
    }
    return Math.min(score, 1); // Normalize to 0-1
  });

  // Normalize the vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    return embedding.map(val => val / magnitude);
  }
  
  return embedding;
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    // If dimensions don't match, return low similarity
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude > 0 ? dotProduct / magnitude : 0;
}

// ============================================================================
// HIGH-LEVEL FUNCTIONS
// ============================================================================

/**
 * Generate risk explanation
 */
export async function explainRisk(
  entityName: string,
  entityType: string,
  riskScore: number,
  factors: Array<{ name: string; contribution: number; description?: string }>
): Promise<string> {
  const factorList = factors
    .map(f => `- ${f.name}: ${f.contribution}% contribution${f.description ? ` (${f.description})` : ''}`)
    .join('\n');

  const request: LLMRequest = {
    systemPrompt: 'You are a supply chain risk analyst. Provide concise, actionable risk explanations in 2-3 sentences.',
    prompt: `Explain why ${entityName} (${entityType}) has a risk score of ${riskScore}/100.

Risk factors:
${factorList}

Provide a brief, clear explanation suitable for a supply chain manager.`,
    maxTokens: 200,
    temperature: 0.5,
  };

  try {
    const response = await complete(request);
    return response.text;
  } catch (err) {
    // Return a basic explanation if LLM fails
    const topFactor = factors[0];
    return `${entityName} has elevated risk (${riskScore}/100) primarily due to ${topFactor?.name || 'multiple factors'}. Monitor closely and consider contingency plans.`;
  }
}

/**
 * Generate mitigation recommendations
 */
export async function generateMitigationRecommendations(
  entityName: string,
  entityType: string,
  riskScore: number,
  context: string
): Promise<string[]> {
  const request: LLMRequest = {
    systemPrompt: 'You are a supply chain risk mitigation expert. Provide specific, actionable recommendations.',
    prompt: `Generate 3-5 mitigation actions for ${entityName} (${entityType}) with risk score ${riskScore}/100.

Context: ${context}

Return each recommendation on a new line, starting with an action verb. Be specific and practical.`,
    maxTokens: 400,
    temperature: 0.6,
  };

  try {
    const response = await complete(request);
    // Split by newlines and filter empty lines
    return response.text
      .split('\n')
      .map(line => line.replace(/^[\d\.\-\*]+\s*/, '').trim())
      .filter(line => line.length > 10)
      .slice(0, 5);
  } catch (err) {
    // Return default recommendations if LLM fails
    return [
      'Increase monitoring frequency for this supply chain segment',
      'Identify and validate backup suppliers or routes',
      'Build additional safety stock for affected materials',
      'Review contracts for force majeure and flexibility clauses',
    ];
  }
}

/**
 * Analyze news sentiment for supply chain impact
 */
export async function analyzeNewsImpact(
  headline: string,
  description: string,
  affectedRegions: string[]
): Promise<{ sentiment: number; impact: string; confidence: number }> {
  const request: LLMRequest = {
    systemPrompt: 'You are a supply chain intelligence analyst. Analyze news for supply chain impact.',
    prompt: `Analyze this news for supply chain impact:

Headline: ${headline}
Description: ${description}
Affected regions: ${affectedRegions.join(', ')}

Respond in JSON format:
{"sentiment": <-1 to 1>, "impact": "<brief description>", "confidence": <0 to 1>}`,
    maxTokens: 150,
    temperature: 0.3,
  };

  try {
    const response = await complete(request);
    // Try to parse JSON from response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        sentiment: Math.max(-1, Math.min(1, parsed.sentiment || 0)),
        impact: parsed.impact || 'Unknown impact',
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
      };
    }
  } catch (err) {
    // Silent fail
  }

  // Default response
  return {
    sentiment: -0.3,
    impact: 'Potential supply chain disruption',
    confidence: 0.5,
  };
}

// Log initial status
console.log('[LLM Service] Initialized:', {
  openai: !!openai,
  localModels: '@huggingface/transformers (lazy loaded)',
});

// Pre-warm embedding pipeline in background (optional)
setTimeout(() => {
  getEmbeddingPipeline().catch(() => {});
}, 5000);
