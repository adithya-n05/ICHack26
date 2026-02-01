// backend/src/agents/riskAnalysisAgent.ts
// Agent B: Autonomous Risk Analysis Agent
// Monitors events, calculates risks, and raises alerts when thresholds exceeded

import { BaseAgent } from './baseAgent';
import { AgentConfig, AgentDecision, DecisionContext, AgentMessage } from './types';
import { calculateCompanyRisk, calculatePortRisk, getHighRiskEntities, RiskScore } from '../services/riskEngine';
import { runMonteCarloSimulation } from '../services/monteCarlo';
import { analyzeNewsSentiment } from '../services/mlRiskEngine';
import { supabase } from '../lib/supabase';

const RISK_THRESHOLDS = {
  critical: 75,
  high: 50,
  medium: 25,
};

const config: AgentConfig = {
  id: 'risk-analysis-agent',
  name: 'Risk Analysis Agent',
  description: 'Analyzes supply chain risks using Monte Carlo simulation, ML, and real-time event data',
  capabilities: [
    {
      name: 'Event Risk Analysis',
      description: 'Analyze incoming events for supply chain impact',
      inputTypes: ['NEW_EVENTS_INGESTED', 'REQUEST_RISK_ANALYSIS'],
      outputTypes: ['RISK_ASSESSMENT_COMPLETE', 'HIGH_RISK_DETECTED', 'RISK_ESCALATION'],
    },
    {
      name: 'Sentiment Analysis',
      description: 'Analyze news sentiment for risk signals',
      inputTypes: ['NEW_NEWS_INGESTED'],
      outputTypes: ['RISK_ASSESSMENT_COMPLETE'],
    },
    {
      name: 'Continuous Monitoring',
      description: 'Periodic risk reassessment',
      inputTypes: ['SYSTEM_HEALTH_CHECK'],
      outputTypes: ['RISK_ASSESSMENT_COMPLETE', 'RISK_RESOLVED'],
    },
  ],
  autonomousActions: true,
  maxConcurrentTasks: 3,
};

export class RiskAnalysisAgent extends BaseAgent {
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor() {
    super(config);
  }

  protected async onStart(): Promise<void> {
    // Initialize memory
    this.updateMemory('lastFullAnalysis', null);
    this.updateMemory('trackedRisks', {});
    this.updateMemory('analysisCount', 0);

    // Start periodic full analysis (every 5 minutes)
    this.analysisInterval = setInterval(async () => {
      await this.performFullAnalysis();
    }, 5 * 60 * 1000);

    // Initial analysis
    setTimeout(() => this.performFullAnalysis(), 5000);
  }

  protected async onStop(): Promise<void> {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }
  }

  protected async decide(context: DecisionContext): Promise<AgentDecision> {
    const { triggeredBy } = context;

    switch (triggeredBy.type) {
      case 'NEW_EVENTS_INGESTED':
        return this.handleNewEvents(context);

      case 'NEW_NEWS_INGESTED':
        return this.handleNewNews(context);

      case 'REQUEST_RISK_ANALYSIS':
        return this.handleRiskAnalysisRequest(context);

      case 'SYSTEM_HEALTH_CHECK':
        return this.handleHealthCheck(context);

      default:
        return {
          action: 'ignore',
          reason: `Unhandled message type: ${triggeredBy.type}`,
          outputMessages: [],
        };
    }
  }

  /**
   * Handle new events being ingested
   */
  private async handleNewEvents(context: DecisionContext): Promise<AgentDecision> {
    const events = context.triggeredBy.payload.events || [];
    const outputMessages: AgentDecision['outputMessages'] = [];
    const memoryUpdates: Record<string, any> = {};

    if (events.length === 0) {
      return {
        action: 'ignore',
        reason: 'No events to analyze',
        outputMessages: [],
      };
    }

    console.log(`[Risk Analysis Agent] Analyzing ${events.length} new events...`);

    // Analyze each high-severity event
    const highSeverityEvents = events.filter((e: any) => e.severity >= 6);
    const newRisks: RiskScore[] = [];

    for (const event of highSeverityEvents) {
      // Find affected companies/ports
      const affected = await this.findAffectedEntities(event);

      for (const entity of affected) {
        let riskScore: RiskScore | null = null;

        if (entity.type === 'company') {
          riskScore = await calculateCompanyRisk(entity.id);
        } else if (entity.type === 'port') {
          riskScore = await calculatePortRisk(entity.id);
        }

        if (riskScore && riskScore.riskScore >= RISK_THRESHOLDS.medium) {
          newRisks.push(riskScore);

          // Track in memory
          const trackedRisks = this.getMemory<Record<string, RiskScore>>('trackedRisks', {})!;
          const previousRisk = trackedRisks[entity.id];

          trackedRisks[entity.id] = riskScore;
          memoryUpdates.trackedRisks = trackedRisks;

          // Check for escalation
          if (riskScore.riskScore >= RISK_THRESHOLDS.critical) {
            outputMessages.push({
              type: 'HIGH_RISK_DETECTED',
              toAgent: 'broadcast',
              payload: {
                entity,
                riskScore,
                triggerEvent: event,
                requiresImmediate: true,
              },
              priority: 'critical',
              requiresAck: true,
            });
          } else if (previousRisk && riskScore.riskScore > previousRisk.riskScore + 10) {
            // Risk escalated significantly
            outputMessages.push({
              type: 'RISK_ESCALATION',
              toAgent: 'orchestrator',
              payload: {
                entity,
                previousScore: previousRisk.riskScore,
                currentScore: riskScore.riskScore,
                increase: riskScore.riskScore - previousRisk.riskScore,
              },
              priority: 'high',
              requiresAck: true,
            });
          }
        }
      }
    }

    // Always send summary
    outputMessages.push({
      type: 'RISK_ASSESSMENT_COMPLETE',
      toAgent: 'orchestrator',
      payload: {
        analyzedEvents: events.length,
        highSeverityEvents: highSeverityEvents.length,
        newRisksDetected: newRisks.length,
        criticalRisks: newRisks.filter(r => r.riskScore >= RISK_THRESHOLDS.critical).length,
        timestamp: new Date().toISOString(),
      },
      priority: 'normal',
      requiresAck: false,
    });

    memoryUpdates.analysisCount = (this.getMemory<number>('analysisCount', 0) || 0) + 1;

    return {
      action: 'process',
      reason: `Analyzed ${events.length} events, detected ${newRisks.length} risks`,
      outputMessages,
      memoryUpdates,
    };
  }

  /**
   * Handle new news articles
   */
  private async handleNewNews(context: DecisionContext): Promise<AgentDecision> {
    const newsItems = context.triggeredBy.payload.news || [];
    const outputMessages: AgentDecision['outputMessages'] = [];

    if (newsItems.length === 0) {
      return {
        action: 'ignore',
        reason: 'No news to analyze',
        outputMessages: [],
      };
    }

    console.log(`[Risk Analysis Agent] Analyzing sentiment for ${newsItems.length} news items...`);

    let negativeCount = 0;
    let totalSentiment = 0;

    for (const news of newsItems.slice(0, 10)) { // Limit to avoid rate limits
      try {
        const sentiment = await analyzeNewsSentiment(`${news.title} ${news.description || ''}`);
        totalSentiment += sentiment.score;

        if (sentiment.score < -0.5) {
          negativeCount++;
        }
      } catch (err) {
        console.error('[Risk Analysis Agent] Sentiment analysis failed:', err);
      }
    }

    const avgSentiment = totalSentiment / Math.min(newsItems.length, 10);

    // If overall sentiment is very negative, flag it
    if (avgSentiment < -0.3 && negativeCount >= 3) {
      outputMessages.push({
        type: 'HIGH_RISK_DETECTED',
        toAgent: 'orchestrator',
        payload: {
          source: 'sentiment_analysis',
          avgSentiment,
          negativeNewsCount: negativeCount,
          samples: newsItems.slice(0, 3).map((n: any) => n.title),
        },
        priority: 'high',
        requiresAck: false,
      });
    }

    outputMessages.push({
      type: 'RISK_ASSESSMENT_COMPLETE',
      toAgent: 'orchestrator',
      payload: {
        type: 'news_sentiment',
        analyzedItems: newsItems.length,
        avgSentiment,
        negativeCount,
      },
      priority: 'normal',
      requiresAck: false,
    });

    return {
      action: 'process',
      reason: `Analyzed ${newsItems.length} news items, avg sentiment: ${avgSentiment.toFixed(2)}`,
      outputMessages,
    };
  }

  /**
   * Handle direct risk analysis request
   */
  private async handleRiskAnalysisRequest(context: DecisionContext): Promise<AgentDecision> {
    const { entityId, entityType } = context.triggeredBy.payload;

    let riskScore: RiskScore | null = null;

    if (entityType === 'company') {
      riskScore = await calculateCompanyRisk(entityId);
    } else if (entityType === 'port') {
      riskScore = await calculatePortRisk(entityId);
    }

    if (!riskScore) {
      return {
        action: 'process',
        reason: 'Entity not found or analysis failed',
        outputMessages: [{
          type: 'RISK_ASSESSMENT_COMPLETE',
          toAgent: context.triggeredBy.fromAgent,
          payload: { entityId, error: 'Analysis failed' },
          priority: 'normal',
          requiresAck: false,
        }],
      };
    }

    // Run Monte Carlo for additional insights
    let monteCarloResult = null;
    try {
      monteCarloResult = await runMonteCarloSimulation(
        { companyId: entityId },
        { iterations: 1000, timeHorizonDays: 30 }
      );
    } catch (err) {
      console.error('[Risk Analysis Agent] Monte Carlo failed:', err);
    }

    const outputMessages: AgentDecision['outputMessages'] = [{
      type: 'RISK_ASSESSMENT_COMPLETE',
      toAgent: context.triggeredBy.fromAgent,
      payload: {
        entityId,
        entityType,
        riskScore,
        monteCarloResult: monteCarloResult ? {
          mean: monteCarloResult.riskDistribution.mean,
          percentile95: monteCarloResult.riskDistribution.percentile95,
          var95: monteCarloResult.riskDistribution.var95,
          topScenarios: monteCarloResult.scenarioProbabilities.slice(0, 3),
        } : null,
      },
      priority: 'normal',
      requiresAck: false,
    }];

    // If high risk, also notify mitigation agent
    if (riskScore.riskScore >= RISK_THRESHOLDS.high) {
      outputMessages.push({
        type: 'HIGH_RISK_DETECTED',
        toAgent: 'mitigation-agent',
        payload: { entityId, entityType, riskScore },
        priority: 'high',
        requiresAck: true,
      });
    }

    return {
      action: 'process',
      reason: `Completed analysis for ${entityType} ${entityId}: score ${riskScore.riskScore}`,
      outputMessages,
    };
  }

  /**
   * Handle health check
   */
  private async handleHealthCheck(context: DecisionContext): Promise<AgentDecision> {
    const trackedRisks = this.getMemory<Record<string, RiskScore>>('trackedRisks', {})!;
    const activeRisks = Object.values(trackedRisks).filter(r => r.riskScore >= RISK_THRESHOLDS.medium);

    return {
      action: 'process',
      reason: 'Health check completed',
      outputMessages: [{
        type: 'RISK_ASSESSMENT_COMPLETE',
        toAgent: 'orchestrator',
        payload: {
          type: 'health_check',
          trackedRisksCount: Object.keys(trackedRisks).length,
          activeRisksCount: activeRisks.length,
          criticalCount: activeRisks.filter(r => r.riskScore >= RISK_THRESHOLDS.critical).length,
          lastFullAnalysis: this.getMemory('lastFullAnalysis'),
        },
        priority: 'low',
        requiresAck: false,
      }],
    };
  }

  /**
   * Perform full risk analysis of all entities
   */
  private async performFullAnalysis(): Promise<void> {
    console.log('[Risk Analysis Agent] Starting full analysis...');

    try {
      const highRiskEntities = await getHighRiskEntities(RISK_THRESHOLDS.medium);
      const trackedRisks: Record<string, RiskScore> = {};
      const resolvedRisks: string[] = [];

      // Get previously tracked risks
      const previousTracked = this.getMemory<Record<string, RiskScore>>('trackedRisks', {})!;

      // Update with new risks
      for (const entity of highRiskEntities) {
        trackedRisks[entity.entityId] = entity;
      }

      // Check for resolved risks
      for (const entityId of Object.keys(previousTracked)) {
        if (!trackedRisks[entityId]) {
          resolvedRisks.push(entityId);
        }
      }

      // Notify about resolved risks
      if (resolvedRisks.length > 0) {
        this.sendMessage({
          type: 'RISK_RESOLVED',
          toAgent: 'broadcast',
          payload: {
            resolvedEntities: resolvedRisks,
            count: resolvedRisks.length,
          },
          priority: 'normal',
          requiresAck: false,
        });
      }

      // Update memory
      this.updateMemory('trackedRisks', trackedRisks);
      this.updateMemory('lastFullAnalysis', new Date().toISOString());
      this.updateMemory('activeRisks', Object.keys(trackedRisks).length);

      console.log(`[Risk Analysis Agent] Full analysis complete: ${Object.keys(trackedRisks).length} active risks`);

    } catch (err) {
      console.error('[Risk Analysis Agent] Full analysis failed:', err);
    }
  }

  /**
   * Find entities affected by an event
   */
  private async findAffectedEntities(event: any): Promise<Array<{ id: string; type: string }>> {
    const affected: Array<{ id: string; type: string }> = [];

    // Find companies near the event
    const { data: companies } = await supabase
      .from('companies')
      .select('id, lat, lng')
      .not('lat', 'is', null)
      .not('lng', 'is', null);

    if (companies) {
      const eventLat = event.location?.lat || event.lat;
      const eventLng = event.location?.lng || event.lng;

      for (const company of companies) {
        const distance = this.haversineDistance(
          eventLat, eventLng,
          company.lat, company.lng
        );

        if (distance <= 500) { // 500km radius
          affected.push({ id: company.id, type: 'company' });
        }
      }
    }

    return affected;
  }

  /**
   * Calculate distance between two points
   */
  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
