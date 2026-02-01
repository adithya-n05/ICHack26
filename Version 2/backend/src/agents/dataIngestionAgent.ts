// backend/src/agents/dataIngestionAgent.ts
// Agent A: Data Ingestion Agent
// Wraps the existing cron jobs to participate in the agent system

import { BaseAgent } from './baseAgent';
import { AgentConfig, AgentDecision, DecisionContext } from './types';
import { fetchGdeltEvents } from '../services/gdelt';
import { fetchEarthquakes } from '../services/usgs';
import { fetchWeatherAlerts } from '../services/noaa';
import { fetchNews } from '../services/newsapi';
import { supabase } from '../lib/supabase';

const config: AgentConfig = {
  id: 'data-ingestion-agent',
  name: 'Data Ingestion Agent',
  description: 'Collects and normalizes data from external sources (GDELT, USGS, NOAA, NewsAPI)',
  capabilities: [
    {
      name: 'Event Ingestion',
      description: 'Fetch and store events from multiple sources',
      inputTypes: ['SYSTEM_HEALTH_CHECK'],
      outputTypes: ['NEW_EVENTS_INGESTED', 'DATA_SOURCE_FAILED'],
    },
    {
      name: 'News Ingestion',
      description: 'Fetch and store news articles',
      inputTypes: ['SYSTEM_HEALTH_CHECK'],
      outputTypes: ['NEW_NEWS_INGESTED', 'DATA_SOURCE_FAILED'],
    },
  ],
  autonomousActions: true,
  maxConcurrentTasks: 4,
};

interface DataSourceStatus {
  lastFetch: string | null;
  lastSuccess: string | null;
  consecutiveFailures: number;
  totalFetched: number;
}

export class DataIngestionAgent extends BaseAgent {
  private fetchIntervals: NodeJS.Timeout[] = [];

  constructor() {
    super(config);
  }

  protected async onStart(): Promise<void> {
    // Initialize source status tracking
    this.updateMemory('sourceStatus', {
      gdelt: { lastFetch: null, lastSuccess: null, consecutiveFailures: 0, totalFetched: 0 },
      usgs: { lastFetch: null, lastSuccess: null, consecutiveFailures: 0, totalFetched: 0 },
      noaa: { lastFetch: null, lastSuccess: null, consecutiveFailures: 0, totalFetched: 0 },
      newsapi: { lastFetch: null, lastSuccess: null, consecutiveFailures: 0, totalFetched: 0 },
    });

    // Start autonomous fetching
    this.startAutonomousFetching();

    // Initial fetch after 5 seconds
    setTimeout(() => this.performFullFetch(), 5000);
  }

  protected async onStop(): Promise<void> {
    // Clear all intervals
    for (const interval of this.fetchIntervals) {
      clearInterval(interval);
    }
    this.fetchIntervals = [];
  }

  protected async decide(context: DecisionContext): Promise<AgentDecision> {
    const { triggeredBy } = context;

    switch (triggeredBy.type) {
      case 'SYSTEM_HEALTH_CHECK':
        return this.handleHealthCheck(context);

      default:
        return {
          action: 'ignore',
          reason: `Data Ingestion Agent doesn't handle ${triggeredBy.type}`,
          outputMessages: [],
        };
    }
  }

  /**
   * Handle health check request
   */
  private async handleHealthCheck(context: DecisionContext): Promise<AgentDecision> {
    const sourceStatus = this.getMemory<Record<string, DataSourceStatus>>('sourceStatus', {})!;

    // Check for sources with consecutive failures
    const failingSources = Object.entries(sourceStatus)
      .filter(([_, status]) => status.consecutiveFailures >= 3)
      .map(([name, _]) => name);

    if (failingSources.length > 0) {
      return {
        action: 'escalate',
        reason: `Data sources failing: ${failingSources.join(', ')}`,
        outputMessages: [{
          type: 'DATA_SOURCE_FAILED',
          toAgent: 'orchestrator',
          payload: {
            failingSources,
            sourceStatus,
          },
          priority: 'high',
          requiresAck: true,
        }],
      };
    }

    return {
      action: 'process',
      reason: 'All data sources healthy',
      outputMessages: [],
    };
  }

  /**
   * Start autonomous data fetching on intervals
   */
  private startAutonomousFetching(): void {
    // GDELT - every 15 minutes
    this.fetchIntervals.push(setInterval(() => {
      this.fetchGdelt();
    }, 15 * 60 * 1000));

    // USGS - every 15 minutes
    this.fetchIntervals.push(setInterval(() => {
      this.fetchUsgs();
    }, 15 * 60 * 1000));

    // NOAA - every 30 minutes
    this.fetchIntervals.push(setInterval(() => {
      this.fetchNoaa();
    }, 30 * 60 * 1000));

    // NewsAPI - every 30 minutes
    this.fetchIntervals.push(setInterval(() => {
      this.fetchNewsApi();
    }, 30 * 60 * 1000));

    console.log('[Data Ingestion Agent] Autonomous fetching started');
  }

  /**
   * Perform full fetch from all sources
   */
  private async performFullFetch(): Promise<void> {
    console.log('[Data Ingestion Agent] Performing full fetch...');
    await Promise.all([
      this.fetchGdelt(),
      this.fetchUsgs(),
      this.fetchNoaa(),
      this.fetchNewsApi(),
    ]);
  }

  /**
   * Fetch from GDELT
   */
  private async fetchGdelt(): Promise<void> {
    const source = 'gdelt';
    this.updateSourceStatus(source, { lastFetch: new Date().toISOString() });

    try {
      const events = await fetchGdeltEvents();
      const saved = await this.saveEvents(events, source);

      this.updateSourceStatus(source, {
        lastSuccess: new Date().toISOString(),
        consecutiveFailures: 0,
        totalFetched: (this.getSourceStatus(source).totalFetched || 0) + saved,
      });

      if (saved > 0) {
        this.notifyNewEvents(events.slice(0, saved), source);
      }

      console.log(`[Data Ingestion Agent] GDELT: ${saved} events saved`);
    } catch (err) {
      this.handleFetchError(source, err);
    }
  }

  /**
   * Fetch from USGS
   */
  private async fetchUsgs(): Promise<void> {
    const source = 'usgs';
    this.updateSourceStatus(source, { lastFetch: new Date().toISOString() });

    try {
      const events = await fetchEarthquakes();
      const saved = await this.saveEvents(events, source);

      this.updateSourceStatus(source, {
        lastSuccess: new Date().toISOString(),
        consecutiveFailures: 0,
        totalFetched: (this.getSourceStatus(source).totalFetched || 0) + saved,
      });

      if (saved > 0) {
        this.notifyNewEvents(events.slice(0, saved), source);
      }

      console.log(`[Data Ingestion Agent] USGS: ${saved} earthquakes saved`);
    } catch (err) {
      this.handleFetchError(source, err);
    }
  }

  /**
   * Fetch from NOAA
   */
  private async fetchNoaa(): Promise<void> {
    const source = 'noaa';
    this.updateSourceStatus(source, { lastFetch: new Date().toISOString() });

    try {
      const events = await fetchWeatherAlerts();
      const saved = await this.saveEvents(events, source);

      this.updateSourceStatus(source, {
        lastSuccess: new Date().toISOString(),
        consecutiveFailures: 0,
        totalFetched: (this.getSourceStatus(source).totalFetched || 0) + saved,
      });

      if (saved > 0) {
        this.notifyNewEvents(events.slice(0, saved), source);
      }

      console.log(`[Data Ingestion Agent] NOAA: ${saved} alerts saved`);
    } catch (err) {
      this.handleFetchError(source, err);
    }
  }

  /**
   * Fetch from NewsAPI
   */
  private async fetchNewsApi(): Promise<void> {
    const source = 'newsapi';
    this.updateSourceStatus(source, { lastFetch: new Date().toISOString() });

    try {
      const news = await fetchNews();
      const saved = await this.saveNews(news);

      this.updateSourceStatus(source, {
        lastSuccess: new Date().toISOString(),
        consecutiveFailures: 0,
        totalFetched: (this.getSourceStatus(source).totalFetched || 0) + saved,
      });

      if (saved > 0) {
        this.notifyNewNews(news.slice(0, saved), source);
      }

      console.log(`[Data Ingestion Agent] NewsAPI: ${saved} articles saved`);
    } catch (err) {
      this.handleFetchError(source, err);
    }
  }

  /**
   * Save events to database
   */
  private async saveEvents(events: any[], source: string): Promise<number> {
    let savedCount = 0;

    for (const event of events) {
      // Skip invalid coordinates
      if (event.location?.lat === 0 && event.location?.lng === 0) continue;

      const { error } = await supabase.from('events').upsert({
        id: event.id,
        type: event.type,
        title: event.title,
        description: event.description,
        lat: event.location?.lat || event.lat,
        lng: event.location?.lng || event.lng,
        severity: event.severity,
        start_date: event.startDate,
        end_date: event.endDate,
        source: event.source || source,
      }, { onConflict: 'id' });

      if (!error) savedCount++;
    }

    return savedCount;
  }

  /**
   * Save news to database
   */
  private async saveNews(newsItems: any[]): Promise<number> {
    let savedCount = 0;

    for (const news of newsItems) {
      const { error } = await supabase.from('news').upsert({
        id: news.id,
        title: news.title,
        description: news.description,
        source: news.source,
        source_url: news.url,
        published_at: news.publishedAt,
        category: news.category,
      }, { onConflict: 'id' });

      if (!error) savedCount++;
    }

    return savedCount;
  }

  /**
   * Notify other agents about new events
   */
  private notifyNewEvents(events: any[], source: string): void {
    this.sendMessage({
      type: 'NEW_EVENTS_INGESTED',
      toAgent: 'broadcast',
      payload: {
        events,
        source,
        count: events.length,
        timestamp: new Date().toISOString(),
      },
      priority: events.some(e => e.severity >= 7) ? 'high' : 'normal',
      requiresAck: false,
    });
  }

  /**
   * Notify other agents about new news
   */
  private notifyNewNews(news: any[], source: string): void {
    this.sendMessage({
      type: 'NEW_NEWS_INGESTED',
      toAgent: 'broadcast',
      payload: {
        news,
        source,
        count: news.length,
        timestamp: new Date().toISOString(),
      },
      priority: 'normal',
      requiresAck: false,
    });
  }

  /**
   * Handle fetch error
   */
  private handleFetchError(source: string, error: any): void {
    console.error(`[Data Ingestion Agent] ${source} fetch error:`, error);

    const status = this.getSourceStatus(source);
    const newFailures = (status.consecutiveFailures || 0) + 1;

    this.updateSourceStatus(source, {
      consecutiveFailures: newFailures,
    });

    // Escalate if too many failures
    if (newFailures >= 3) {
      this.sendMessage({
        type: 'DATA_SOURCE_FAILED',
        toAgent: 'orchestrator',
        payload: {
          source,
          consecutiveFailures: newFailures,
          lastError: (error as Error).message,
        },
        priority: 'high',
        requiresAck: true,
      });
    }
  }

  /**
   * Get source status
   */
  private getSourceStatus(source: string): DataSourceStatus {
    const statuses = this.getMemory<Record<string, DataSourceStatus>>('sourceStatus', {})!;
    return statuses[source] || { lastFetch: null, lastSuccess: null, consecutiveFailures: 0, totalFetched: 0 };
  }

  /**
   * Update source status
   */
  private updateSourceStatus(source: string, updates: Partial<DataSourceStatus>): void {
    const statuses = this.getMemory<Record<string, DataSourceStatus>>('sourceStatus', {})!;
    statuses[source] = { ...statuses[source], ...updates };
    this.updateMemory('sourceStatus', statuses);
  }
}
