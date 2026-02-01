// backend/src/agents/mitigationAgent.ts
// Agent C: Autonomous Mitigation Agent
// Responds to risk alerts by finding alternatives and creating mitigation plans

import { BaseAgent } from './baseAgent';
import { AgentConfig, AgentDecision, DecisionContext } from './types';
import { findAlternativeSuppliers, findAlternativeRoutes, MitigationPlan, MitigationAction } from '../services/mitigationAgent';
import { RiskScore } from '../services/riskEngine';
import { complete as llmComplete } from '../services/llmService';

const config: AgentConfig = {
  id: 'mitigation-agent',
  name: 'Mitigation Agent',
  description: 'Autonomously generates mitigation plans and finds alternatives when risks are detected',
  capabilities: [
    {
      name: 'Alternative Supplier Discovery',
      description: 'Find alternative suppliers when current ones are at risk',
      inputTypes: ['HIGH_RISK_DETECTED', 'REQUEST_MITIGATION'],
      outputTypes: ['ALTERNATIVES_FOUND', 'NO_ALTERNATIVES_AVAILABLE'],
    },
    {
      name: 'Route Optimization',
      description: 'Find alternative shipping routes avoiding risk zones',
      inputTypes: ['HIGH_RISK_DETECTED'],
      outputTypes: ['ALTERNATIVES_FOUND'],
    },
    {
      name: 'Mitigation Planning',
      description: 'Generate comprehensive mitigation action plans',
      inputTypes: ['HIGH_RISK_DETECTED', 'RISK_ESCALATION'],
      outputTypes: ['MITIGATION_PLAN_READY'],
    },
  ],
  autonomousActions: true,
  maxConcurrentTasks: 5,
};

export class MitigationAgent extends BaseAgent {
  constructor() {
    super(config);
  }

  protected async onStart(): Promise<void> {
    this.updateMemory('activeMitigations', {});
    this.updateMemory('completedMitigations', 0);
    this.updateMemory('alternativesCache', {});
  }

  protected async onStop(): Promise<void> {
    // Cleanup if needed
  }

  protected async decide(context: DecisionContext): Promise<AgentDecision> {
    const { triggeredBy } = context;

    switch (triggeredBy.type) {
      case 'HIGH_RISK_DETECTED':
        return this.handleHighRisk(context);

      case 'RISK_ESCALATION':
        return this.handleEscalation(context);

      case 'REQUEST_MITIGATION':
        return this.handleMitigationRequest(context);

      case 'RISK_RESOLVED':
        return this.handleRiskResolved(context);

      default:
        return {
          action: 'ignore',
          reason: `Unhandled message type: ${triggeredBy.type}`,
          outputMessages: [],
        };
    }
  }

  /**
   * Handle high risk detection - autonomous response
   */
  private async handleHighRisk(context: DecisionContext): Promise<AgentDecision> {
    const { entity, riskScore, triggerEvent, requiresImmediate } = context.triggeredBy.payload;
    const outputMessages: AgentDecision['outputMessages'] = [];
    const memoryUpdates: Record<string, any> = {};

    console.log(`[Mitigation Agent] High risk detected for ${entity?.type || 'entity'} ${entity?.id || riskScore?.entityId}`);

    const entityId = entity?.id || riskScore?.entityId;
    const entityType = entity?.type || riskScore?.entityType || 'company';

    // Check if we're already working on this
    const activeMitigations = this.getMemory<Record<string, any>>('activeMitigations', {})!;
    if (activeMitigations[entityId]) {
      return {
        action: 'ignore',
        reason: `Already processing mitigation for ${entityId}`,
        outputMessages: [],
      };
    }

    // Mark as active
    activeMitigations[entityId] = {
      startedAt: new Date().toISOString(),
      status: 'in_progress',
    };
    memoryUpdates.activeMitigations = activeMitigations;

    try {
      // Find alternative suppliers
      const alternatives = await findAlternativeSuppliers(entityId, undefined, []);
      
      if (alternatives.length > 0) {
        outputMessages.push({
          type: 'ALTERNATIVES_FOUND',
          toAgent: 'broadcast',
          payload: {
            entityId,
            entityType,
            alternativeSuppliers: alternatives.slice(0, 5),
            count: alternatives.length,
          },
          priority: requiresImmediate ? 'critical' : 'high',
          requiresAck: false,
        });

        // Cache alternatives
        const cache = this.getMemory<Record<string, any>>('alternativesCache', {})!;
        cache[entityId] = {
          suppliers: alternatives,
          cachedAt: new Date().toISOString(),
        };
        memoryUpdates.alternativesCache = cache;
      } else {
        outputMessages.push({
          type: 'NO_ALTERNATIVES_AVAILABLE',
          toAgent: 'orchestrator',
          payload: {
            entityId,
            entityType,
            reason: 'No suitable alternative suppliers found',
          },
          priority: 'high',
          requiresAck: true,
        });
      }

      // Generate mitigation plan
      const plan = await this.generateMitigationPlan(entityId, entityType, riskScore, alternatives);

      outputMessages.push({
        type: 'MITIGATION_PLAN_READY',
        toAgent: 'broadcast',
        payload: {
          entityId,
          plan,
        },
        priority: requiresImmediate ? 'critical' : 'high',
        requiresAck: false,
      });

      // Update active mitigation status
      activeMitigations[entityId].status = 'plan_ready';
      activeMitigations[entityId].planGeneratedAt = new Date().toISOString();
      memoryUpdates.activeMitigations = activeMitigations;

      // Notify alert agent to inform users
      outputMessages.push({
        type: 'REQUEST_ALERT',
        toAgent: 'alert-agent',
        payload: {
          type: 'mitigation_ready',
          entityId,
          entityType,
          alternativesCount: alternatives.length,
          actionCount: plan.actions.length,
        },
        priority: requiresImmediate ? 'critical' : 'high',
        requiresAck: false,
      });

    } catch (err) {
      console.error('[Mitigation Agent] Error handling high risk:', err);
      
      // Mark as failed
      activeMitigations[entityId].status = 'failed';
      activeMitigations[entityId].error = (err as Error).message;
      memoryUpdates.activeMitigations = activeMitigations;

      return {
        action: 'escalate',
        reason: `Failed to generate mitigation: ${(err as Error).message}`,
        outputMessages: [],
        memoryUpdates,
      };
    }

    return {
      action: 'process',
      reason: `Generated mitigation plan with ${outputMessages.length - 1} outputs`,
      outputMessages,
      memoryUpdates,
    };
  }

  /**
   * Handle risk escalation - more urgent response
   */
  private async handleEscalation(context: DecisionContext): Promise<AgentDecision> {
    const { entity, previousScore, currentScore, increase } = context.triggeredBy.payload;
    
    console.log(`[Mitigation Agent] Risk ESCALATION: ${entity?.id} ${previousScore} → ${currentScore} (+${increase})`);

    // For escalations, we prioritize speed over completeness
    const outputMessages: AgentDecision['outputMessages'] = [];

    // Generate immediate actions
    const immediateActions = this.generateImmediateActions(currentScore, increase);

    outputMessages.push({
      type: 'MITIGATION_PLAN_READY',
      toAgent: 'broadcast',
      payload: {
        entityId: entity?.id,
        urgency: 'immediate',
        actions: immediateActions,
        note: 'Escalation response - full plan in progress',
      },
      priority: 'critical',
      requiresAck: true,
    });

    // Request immediate alert
    outputMessages.push({
      type: 'REQUEST_ALERT',
      toAgent: 'alert-agent',
      payload: {
        type: 'risk_escalation',
        severity: 'critical',
        entityId: entity?.id,
        previousScore,
        currentScore,
        immediateActions,
      },
      priority: 'critical',
      requiresAck: true,
    });

    return {
      action: 'process',
      reason: `Escalation response generated with ${immediateActions.length} immediate actions`,
      outputMessages,
    };
  }

  /**
   * Handle explicit mitigation request
   */
  private async handleMitigationRequest(context: DecisionContext): Promise<AgentDecision> {
    const { entityId, entityType, riskScore } = context.triggeredBy.payload;

    // Check cache first
    const cache = this.getMemory<Record<string, any>>('alternativesCache', {})!;
    const cached = cache[entityId];

    if (cached && this.isCacheValid(cached.cachedAt)) {
      return {
        action: 'process',
        reason: 'Returning cached alternatives',
        outputMessages: [{
          type: 'ALTERNATIVES_FOUND',
          toAgent: context.triggeredBy.fromAgent,
          payload: {
            entityId,
            alternativeSuppliers: cached.suppliers,
            fromCache: true,
          },
          priority: 'normal',
          requiresAck: false,
        }],
      };
    }

    // Generate fresh alternatives
    const alternatives = await findAlternativeSuppliers(entityId, undefined, []);
    const plan = await this.generateMitigationPlan(entityId, entityType, riskScore, alternatives);

    return {
      action: 'process',
      reason: `Generated mitigation for ${entityId}`,
      outputMessages: [
        {
          type: 'ALTERNATIVES_FOUND',
          toAgent: context.triggeredBy.fromAgent,
          payload: { entityId, alternativeSuppliers: alternatives },
          priority: 'normal',
          requiresAck: false,
        },
        {
          type: 'MITIGATION_PLAN_READY',
          toAgent: context.triggeredBy.fromAgent,
          payload: { entityId, plan },
          priority: 'normal',
          requiresAck: false,
        },
      ],
    };
  }

  /**
   * Handle risk resolution
   */
  private async handleRiskResolved(context: DecisionContext): Promise<AgentDecision> {
    const { resolvedEntities } = context.triggeredBy.payload;

    // Clear from active mitigations
    const activeMitigations = this.getMemory<Record<string, any>>('activeMitigations', {})!;
    let clearedCount = 0;

    for (const entityId of resolvedEntities || []) {
      if (activeMitigations[entityId]) {
        delete activeMitigations[entityId];
        clearedCount++;
      }
    }

    const completed = this.getMemory<number>('completedMitigations', 0)!;

    return {
      action: 'process',
      reason: `Cleared ${clearedCount} resolved mitigations`,
      outputMessages: [],
      memoryUpdates: {
        activeMitigations,
        completedMitigations: completed + clearedCount,
      },
    };
  }

  /**
   * Generate a comprehensive mitigation plan
   */
  private async generateMitigationPlan(
    entityId: string,
    entityType: string,
    riskScore: RiskScore | null,
    alternatives: any[]
  ): Promise<MitigationPlan> {
    const actions: MitigationAction[] = [];

    // Immediate actions
    actions.push({
      priority: 'immediate',
      action: 'Notify procurement team',
      description: 'Alert procurement team of potential supply disruption',
      impact: 'high',
      effort: 'low',
    });

    if (alternatives.length > 0) {
      actions.push({
        priority: 'immediate',
        action: 'Contact alternative suppliers',
        description: `Reach out to top ${Math.min(3, alternatives.length)} alternative suppliers for quotes`,
        impact: 'high',
        effort: 'medium',
      });
    }

    // Short-term actions
    actions.push({
      priority: 'short-term',
      action: 'Increase safety stock',
      description: 'Increase inventory buffer for affected materials',
      impact: 'medium',
      effort: 'medium',
    });

    actions.push({
      priority: 'short-term',
      action: 'Diversify supplier base',
      description: 'Qualify additional suppliers to reduce concentration risk',
      impact: 'high',
      effort: 'high',
    });

    // Long-term actions
    actions.push({
      priority: 'long-term',
      action: 'Regional diversification',
      description: 'Establish supplier relationships in different geographic regions',
      impact: 'high',
      effort: 'high',
    });

    // Use LLM for additional recommendations if available
    if (riskScore) {
      try {
        const llmActions = await this.getLLMRecommendations(entityId, entityType, riskScore);
        actions.push(...llmActions);
      } catch (err) {
        console.error('[Mitigation Agent] LLM recommendations failed:', err);
      }
    }

    return {
      entityId,
      entityName: entityId, // Would be fetched in production
      entityType,
      currentRisk: riskScore || {
        entityId,
        entityType: entityType as 'route' | 'port' | 'country' | 'company',
        entityName: entityId,
        riskLevel: 'high' as const,
        riskScore: 75,
        factors: [],
        trend: 'worsening' as const,
        prediction7d: 80,
        prediction30d: 85,
        updatedAt: new Date().toISOString(),
      },
      actions,
      alternativeSuppliers: alternatives.slice(0, 5),
      alternativeRoutes: [],
      estimatedRiskReduction: 25,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate immediate actions for escalations
   */
  private generateImmediateActions(currentScore: number, increase: number): MitigationAction[] {
    const actions: MitigationAction[] = [];

    actions.push({
      priority: 'immediate',
      action: 'Executive escalation',
      description: `Risk increased by ${increase} points - requires executive attention`,
      impact: 'high',
      effort: 'low',
    });

    if (currentScore >= 80) {
      actions.push({
        priority: 'immediate',
        action: 'Activate contingency plan',
        description: 'Implement pre-defined contingency measures immediately',
        impact: 'high',
        effort: 'medium',
      });

      actions.push({
        priority: 'immediate',
        action: 'Customer communication',
        description: 'Prepare proactive communication for affected customers',
        impact: 'high',
        effort: 'medium',
      });
    }

    return actions;
  }

  /**
   * Get LLM-generated recommendations
   */
  private async getLLMRecommendations(
    entityId: string,
    entityType: string,
    riskScore: RiskScore
  ): Promise<MitigationAction[]> {
    try {
      const response = await llmComplete({
        systemPrompt: `You are a supply chain risk mitigation expert. Given a risk assessment, suggest 2-3 specific, actionable mitigation steps. Return as JSON array with objects containing: priority (immediate/short-term/long-term), action (brief title), description, impact (high/medium/low), effort (high/medium/low).`,
        prompt: `Entity: ${entityType} ${entityId}
Risk Score: ${riskScore.riskScore}/100 (${riskScore.riskLevel})
Trend: ${riskScore.trend}
Key Factors: ${riskScore.factors.map(f => f.description).join('; ')}

Suggest specific mitigation actions. Return as JSON: {"actions": [...]}`,
        maxTokens: 500,
        temperature: 0.5,
      });

      // Try to parse JSON from response
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.actions || [];
      }
    } catch (err) {
      console.error('[Mitigation Agent] LLM recommendations failed:', err);
    }

    return [];
  }

  /**
   * Check if cache is still valid (15 minutes)
   */
  private isCacheValid(cachedAt: string): boolean {
    const cacheAge = Date.now() - new Date(cachedAt).getTime();
    return cacheAge < 15 * 60 * 1000;
  }
}
