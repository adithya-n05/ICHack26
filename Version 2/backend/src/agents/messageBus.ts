// backend/src/agents/messageBus.ts
// Event-driven message bus for inter-agent communication

import { EventEmitter } from 'events';
import { AgentMessage, AgentId, MessageType } from './types';

// Simple ID generator (avoids uuid dependency)
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}

class MessageBus extends EventEmitter {
  private messageHistory: AgentMessage[] = [];
  private subscriptions: Map<AgentId, Set<MessageType | 'all'>> = new Map();
  private pendingAcks: Map<string, { message: AgentMessage; timeout: NodeJS.Timeout }> = new Map();
  private maxHistorySize = 1000;

  constructor() {
    super();
    this.setMaxListeners(20); // Allow multiple agent listeners
  }

  /**
   * Subscribe an agent to specific message types
   */
  subscribe(agentId: AgentId, messageTypes: (MessageType | 'all')[]): void {
    if (!this.subscriptions.has(agentId)) {
      this.subscriptions.set(agentId, new Set());
    }
    const subs = this.subscriptions.get(agentId)!;
    messageTypes.forEach(type => subs.add(type));
    console.log(`[MessageBus] ${agentId} subscribed to: ${messageTypes.join(', ')}`);
  }

  /**
   * Unsubscribe an agent from message types
   */
  unsubscribe(agentId: AgentId, messageTypes?: MessageType[]): void {
    if (messageTypes) {
      const subs = this.subscriptions.get(agentId);
      messageTypes.forEach(type => subs?.delete(type));
    } else {
      this.subscriptions.delete(agentId);
    }
  }

  /**
   * Publish a message to the bus
   */
  publish(message: Omit<AgentMessage, 'id' | 'timestamp'>): AgentMessage {
    const fullMessage: AgentMessage = {
      ...message,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };

    // Store in history
    this.messageHistory.push(fullMessage);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }

    // Log the message
    const priorityIcon = {
      low: '⬜',
      normal: '🟦',
      high: '🟧',
      critical: '🟥',
    }[fullMessage.priority];
    
    console.log(
      `[MessageBus] ${priorityIcon} ${fullMessage.fromAgent} → ${fullMessage.toAgent}: ${fullMessage.type}`
    );

    // Handle acknowledgment tracking
    if (fullMessage.requiresAck) {
      const timeout = setTimeout(() => {
        console.warn(`[MessageBus] ⚠️ No ACK received for message ${fullMessage.id}`);
        this.emit('ack-timeout', fullMessage);
        this.pendingAcks.delete(fullMessage.id);
      }, 30000); // 30 second timeout

      this.pendingAcks.set(fullMessage.id, { message: fullMessage, timeout });
    }

    // Emit to specific agent or broadcast
    if (fullMessage.toAgent === 'broadcast') {
      this.emit('broadcast', fullMessage);
      // Also emit to each subscribed agent
      for (const [agentId, subs] of this.subscriptions) {
        if (subs.has(fullMessage.type) || subs.has('all')) {
          this.emit(`agent:${agentId}`, fullMessage);
        }
      }
    } else {
      this.emit(`agent:${fullMessage.toAgent}`, fullMessage);
    }

    // Emit general message event for monitoring
    this.emit('message', fullMessage);

    return fullMessage;
  }

  /**
   * Acknowledge receipt of a message
   */
  acknowledge(messageId: string, agentId: AgentId): void {
    const pending = this.pendingAcks.get(messageId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingAcks.delete(messageId);
      console.log(`[MessageBus] ✓ ACK from ${agentId} for message ${messageId}`);
    }
  }

  /**
   * Create a reply message
   */
  createReply(
    originalMessage: AgentMessage,
    type: MessageType,
    payload: Record<string, any>,
    fromAgent: AgentId
  ): Omit<AgentMessage, 'id' | 'timestamp'> {
    return {
      type,
      fromAgent,
      toAgent: originalMessage.fromAgent,
      payload,
      correlationId: originalMessage.correlationId || originalMessage.id,
      priority: originalMessage.priority,
      requiresAck: false,
    };
  }

  /**
   * Get message history, optionally filtered
   */
  getHistory(filters?: {
    fromAgent?: AgentId;
    toAgent?: AgentId;
    type?: MessageType;
    since?: string;
    correlationId?: string;
  }): AgentMessage[] {
    let messages = [...this.messageHistory];

    if (filters) {
      if (filters.fromAgent) {
        messages = messages.filter(m => m.fromAgent === filters.fromAgent);
      }
      if (filters.toAgent) {
        messages = messages.filter(m => m.toAgent === filters.toAgent || m.toAgent === 'broadcast');
      }
      if (filters.type) {
        messages = messages.filter(m => m.type === filters.type);
      }
      if (filters.since !== undefined) {
        const since = filters.since;
        messages = messages.filter(m => m.timestamp >= since);
      }
      if (filters.correlationId) {
        messages = messages.filter(m => 
          m.correlationId === filters.correlationId || m.id === filters.correlationId
        );
      }
    }

    return messages;
  }

  /**
   * Get related messages by correlation ID
   */
  getConversation(correlationId: string): AgentMessage[] {
    return this.messageHistory.filter(
      m => m.correlationId === correlationId || m.id === correlationId
    );
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
  }
}

// Singleton instance
export const messageBus = new MessageBus();
