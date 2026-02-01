// backend/src/agents/baseAgent.ts
// Abstract base class for all agents

import { EventEmitter } from 'events';
import { messageBus } from './messageBus';
import {
  AgentId,
  AgentMessage,
  AgentState,
  AgentConfig,
  AgentDecision,
  DecisionContext,
  MessageType,
} from './types';

export abstract class BaseAgent extends EventEmitter {
  protected config: AgentConfig;
  protected state: AgentState;
  protected isRunning: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: AgentConfig) {
    super();
    this.config = config;
    this.state = {
      id: config.id,
      status: 'idle',
      lastHeartbeat: new Date().toISOString(),
      processedMessages: 0,
      errorCount: 0,
      memory: {},
    };
  }

  /**
   * Start the agent
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    console.log(`[${this.config.name}] Starting...`);
    this.isRunning = true;
    this.state.status = 'idle';

    // Subscribe to relevant message types
    const inputTypes = this.config.capabilities.flatMap(c => c.inputTypes);
    messageBus.subscribe(this.config.id, [...new Set(inputTypes)]);

    // Listen for messages
    messageBus.on(`agent:${this.config.id}`, this.handleMessage.bind(this));

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 10000); // Every 10 seconds

    // Agent-specific initialization
    await this.onStart();

    console.log(`[${this.config.name}] Started successfully`);
  }

  /**
   * Stop the agent
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log(`[${this.config.name}] Stopping...`);
    this.isRunning = false;
    this.state.status = 'offline';

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    messageBus.unsubscribe(this.config.id);
    messageBus.off(`agent:${this.config.id}`, this.handleMessage.bind(this));

    await this.onStop();

    console.log(`[${this.config.name}] Stopped`);
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(message: AgentMessage): Promise<void> {
    if (!this.isRunning) return;

    try {
      this.state.status = 'processing';
      this.state.currentTask = `Processing ${message.type}`;

      // Acknowledge if required
      if (message.requiresAck) {
        messageBus.acknowledge(message.id, this.config.id);
      }

      // Build decision context
      const context = await this.buildDecisionContext(message);

      // Make decision
      const decision = await this.decide(context);

      // Execute decision
      await this.executeDecision(decision, message);

      this.state.processedMessages++;
      this.state.status = 'idle';
      this.state.currentTask = undefined;

    } catch (error) {
      console.error(`[${this.config.name}] Error processing message:`, error);
      this.state.errorCount++;
      this.state.status = 'error';

      // Notify orchestrator of error
      this.sendMessage({
        type: 'AGENT_HEARTBEAT',
        toAgent: 'orchestrator',
        payload: {
          error: (error as Error).message,
          failedMessage: message.id,
        },
        priority: 'high',
        requiresAck: false,
      });
    }
  }

  /**
   * Build context for decision-making
   */
  private async buildDecisionContext(message: AgentMessage): Promise<DecisionContext> {
    // Get related messages
    const relatedMessages = message.correlationId
      ? messageBus.getConversation(message.correlationId)
      : [];

    // Get recent messages from same source
    const recentFromSender = messageBus.getHistory({
      fromAgent: message.fromAgent,
      since: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // Last 5 minutes
    });

    return {
      triggeredBy: message,
      relatedMessages: [...relatedMessages, ...recentFromSender],
      agentMemory: this.state.memory,
      systemState: await this.getSystemState(),
    };
  }

  /**
   * Get current system state
   */
  protected async getSystemState(): Promise<DecisionContext['systemState']> {
    // Default implementation - can be overridden
    return {
      activeRisks: this.state.memory.activeRisks || 0,
      pendingMitigations: this.state.memory.pendingMitigations || 0,
      recentAlerts: this.state.memory.recentAlerts || 0,
    };
  }

  /**
   * Execute a decision
   */
  private async executeDecision(decision: AgentDecision, originalMessage: AgentMessage): Promise<void> {
    console.log(`[${this.config.name}] Decision: ${decision.action} - ${decision.reason}`);

    // Update memory
    if (decision.memoryUpdates) {
      this.state.memory = { ...this.state.memory, ...decision.memoryUpdates };
    }

    // Send output messages
    for (const msg of decision.outputMessages) {
      this.sendMessage({
        ...msg,
        correlationId: msg.correlationId || originalMessage.correlationId || originalMessage.id,
      });
    }

    // Handle special actions
    if (decision.action === 'escalate') {
      this.sendMessage({
        type: 'RISK_ESCALATION',
        toAgent: 'orchestrator',
        payload: {
          originalMessage,
          reason: decision.reason,
        },
        priority: 'high',
        requiresAck: true,
      });
    }
  }

  /**
   * Send a message via the bus
   */
  protected sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp' | 'fromAgent'>): AgentMessage {
    return messageBus.publish({
      ...message,
      fromAgent: this.config.id,
    });
  }

  /**
   * Send heartbeat to orchestrator
   */
  private sendHeartbeat(): void {
    this.state.lastHeartbeat = new Date().toISOString();
    
    this.sendMessage({
      type: 'AGENT_HEARTBEAT',
      toAgent: 'orchestrator',
      payload: {
        status: this.state.status,
        processedMessages: this.state.processedMessages,
        errorCount: this.state.errorCount,
        currentTask: this.state.currentTask,
        memorySize: Object.keys(this.state.memory).length,
      },
      priority: 'low',
      requiresAck: false,
    });
  }

  /**
   * Update agent memory
   */
  protected updateMemory(key: string, value: any): void {
    this.state.memory[key] = value;
  }

  /**
   * Get value from memory
   */
  protected getMemory<T>(key: string, defaultValue?: T): T | undefined {
    return this.state.memory[key] ?? defaultValue;
  }

  /**
   * Get agent state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Get agent config
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  // Abstract methods to be implemented by specific agents
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract decide(context: DecisionContext): Promise<AgentDecision>;
}
