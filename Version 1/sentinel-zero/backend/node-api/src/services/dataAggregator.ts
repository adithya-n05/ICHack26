/**
 * Data Aggregator Service
 * Combines data from all sources and broadcasts updates
 * Manages periodic fetching and Supabase persistence
 */

import { WebSocketServer } from 'ws';
import { USGSService, RiskZone } from './usgs.js';
import { GDELTService, NewsItem } from './gdelt.js';
import { NOAAService, StormRiskZone } from './noaa.js';
import { ReliefWebService, ConflictRiskZone } from './reliefweb.js';
import { PerplexityService, IndustryNews } from './perplexity.js';
import { supabaseService } from './supabase.js';

// Union type for all risk zones
export type AnyRiskZone = RiskZone | StormRiskZone | ConflictRiskZone;

export interface AggregatedData {
  riskZones: AnyRiskZone[];
  news: (NewsItem | IndustryNews)[];
  lastUpdated: Date;
}

export class DataAggregator {
  private usgsService: USGSService;
  private gdeltService: GDELTService;
  private noaaService: NOAAService;
  private reliefwebService: ReliefWebService;
  private perplexityService: PerplexityService;

  private wss: WebSocketServer | null = null;
  private lastData: AggregatedData | null = null;

  // Fetch intervals (in ms)
  private readonly EARTHQUAKE_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly STORM_INTERVAL = 10 * 60 * 1000; // 10 minutes
  private readonly NEWS_INTERVAL = 15 * 60 * 1000; // 15 minutes
  private readonly CONFLICT_INTERVAL = 30 * 60 * 1000; // 30 minutes
  private readonly PERPLEXITY_INTERVAL = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.usgsService = new USGSService();
    this.gdeltService = new GDELTService();
    this.noaaService = new NOAAService();
    this.reliefwebService = new ReliefWebService();
    this.perplexityService = new PerplexityService();
  }

  /**
   * Initialize the aggregator with WebSocket server
   */
  initialize(wss: WebSocketServer): void {
    this.wss = wss;
    console.log('Data Aggregator initialized');
  }

  /**
   * Start all data fetching pipelines
   */
  async startAllPipelines(): Promise<void> {
    console.log('Starting all data pipelines...');

    // Initial fetch of all data
    await this.fetchAllData();

    // Set up periodic fetching
    setInterval(() => this.fetchEarthquakes(), this.EARTHQUAKE_INTERVAL);
    setInterval(() => this.fetchStorms(), this.STORM_INTERVAL);
    setInterval(() => this.fetchNews(), this.NEWS_INTERVAL);
    setInterval(() => this.fetchConflicts(), this.CONFLICT_INTERVAL);
    setInterval(() => this.fetchPerplexityNews(), this.PERPLEXITY_INTERVAL);

    console.log('All data pipelines started');
  }

  /**
   * Fetch all data sources at once
   */
  async fetchAllData(): Promise<AggregatedData> {
    console.log('Fetching all data sources...');

    const [earthquakes, storms, gdeltNews, conflicts, perplexityNews] = await Promise.allSettled([
      this.usgsService.fetchRecentEarthquakes(),
      this.noaaService.fetchActiveAlerts(),
      this.gdeltService.fetchSupplyChainNews(),
      this.reliefwebService.getActiveConflictZones(),
      this.perplexityService.fetchSupplyChainNews(),
    ]);

    const riskZones: AnyRiskZone[] = [];
    const news: (NewsItem | IndustryNews)[] = [];

    // Process earthquakes
    if (earthquakes.status === 'fulfilled') {
      riskZones.push(...earthquakes.value);
      console.log(`Fetched ${earthquakes.value.length} earthquakes`);
    } else {
      console.error('Failed to fetch earthquakes:', earthquakes.reason);
    }

    // Process storms
    if (storms.status === 'fulfilled') {
      riskZones.push(...storms.value);
      console.log(`Fetched ${storms.value.length} storm alerts`);
    } else {
      console.error('Failed to fetch storms:', storms.reason);
    }

    // Process conflicts
    if (conflicts.status === 'fulfilled') {
      riskZones.push(...conflicts.value);
      console.log(`Fetched ${conflicts.value.length} conflict zones`);
    } else {
      console.error('Failed to fetch conflicts:', conflicts.reason);
    }

    // Process GDELT news
    if (gdeltNews.status === 'fulfilled') {
      news.push(...gdeltNews.value);
      console.log(`Fetched ${gdeltNews.value.length} GDELT articles`);
    } else {
      console.error('Failed to fetch GDELT news:', gdeltNews.reason);
    }

    // Process Perplexity news
    if (perplexityNews.status === 'fulfilled') {
      news.push(...perplexityNews.value);
      console.log(`Fetched ${perplexityNews.value.length} Perplexity articles`);
    } else {
      console.error('Failed to fetch Perplexity news:', perplexityNews.reason);
    }

    this.lastData = {
      riskZones,
      news,
      lastUpdated: new Date(),
    };

    // Persist to Supabase (non-blocking)
    this.persistRiskEvents(riskZones).catch(err => console.error('Failed to persist risk events:', err));
    this.persistNews(news).catch(err => console.error('Failed to persist news:', err));

    // Broadcast updates
    this.broadcastUpdate('FULL_UPDATE', this.lastData);

    return this.lastData;
  }

  /**
   * Fetch earthquakes and broadcast update
   */
  private async fetchEarthquakes(): Promise<void> {
    try {
      const earthquakes = await this.usgsService.fetchRecentEarthquakes();
      console.log(`Fetched ${earthquakes.length} earthquakes`);

      await this.persistRiskEvents(earthquakes);
      this.broadcastUpdate('RISK_ZONES_UPDATE', { type: 'earthquake', data: earthquakes });
    } catch (error) {
      console.error('Error fetching earthquakes:', error);
    }
  }

  /**
   * Fetch storms and broadcast update
   */
  private async fetchStorms(): Promise<void> {
    try {
      const storms = await this.noaaService.fetchActiveAlerts();
      console.log(`Fetched ${storms.length} storm alerts`);

      await this.persistRiskEvents(storms);
      this.broadcastUpdate('RISK_ZONES_UPDATE', { type: 'storm', data: storms });
    } catch (error) {
      console.error('Error fetching storms:', error);
    }
  }

  /**
   * Fetch news from GDELT
   */
  private async fetchNews(): Promise<void> {
    try {
      const news = await this.gdeltService.fetchSupplyChainNews();
      console.log(`Fetched ${news.length} GDELT articles`);

      await this.persistNews(news);
      this.broadcastUpdate('NEWS_UPDATE', { source: 'gdelt', data: news });
    } catch (error) {
      console.error('Error fetching news:', error);
    }
  }

  /**
   * Fetch conflicts from ReliefWeb
   */
  private async fetchConflicts(): Promise<void> {
    try {
      const conflicts = await this.reliefwebService.getActiveConflictZones();
      console.log(`Fetched ${conflicts.length} conflict zones`);

      await this.persistRiskEvents(conflicts);
      this.broadcastUpdate('RISK_ZONES_UPDATE', { type: 'conflict', data: conflicts });
    } catch (error) {
      console.error('Error fetching conflicts:', error);
    }
  }

  /**
   * Fetch industry news from Perplexity
   */
  private async fetchPerplexityNews(): Promise<void> {
    try {
      const news = await this.perplexityService.fetchSupplyChainNews();
      if (news.length > 0) {
        console.log(`Fetched ${news.length} Perplexity articles`);
        await this.persistNews(news);
        this.broadcastUpdate('NEWS_UPDATE', { source: 'perplexity', data: news });
      }
    } catch (error) {
      console.error('Error fetching Perplexity news:', error);
    }
  }

  /**
   * Persist risk events to Supabase
   */
  private async persistRiskEvents(zones: AnyRiskZone[]): Promise<void> {
    try {
      const dbEvents = zones.map((zone) => ({
        id: zone.id,
        type: zone.type,
        coordinates: `POINT(${zone.coordinates[0]} ${zone.coordinates[1]})`,
        intensity: zone.intensity,
        radius_km: zone.radius,
        description: zone.description,
        source: this.getSourceFromId(zone.id),
        expires_at: 'expires' in zone && zone.expires ? zone.expires.toISOString() : null,
      }));

      await supabaseService.upsertRiskEvents(dbEvents);
    } catch (error) {
      console.error('Error persisting risk events:', error);
    }
  }

  /**
   * Persist news to Supabase
   */
  private async persistNews(news: (NewsItem | IndustryNews)[]): Promise<void> {
    try {
      const dbNews = news.map((item) => ({
        id: item.id,
        title: item.title,
        source: item.source,
        severity: item.severity,
        region: item.region,
        impact_score: item.impactScore,
        url: 'url' in item ? item.url : null,
      }));

      await supabaseService.upsertNews(dbNews);
    } catch (error) {
      console.error('Error persisting news:', error);
    }
  }

  /**
   * Get source name from ID prefix
   */
  private getSourceFromId(id: string): string {
    if (id.startsWith('usgs-')) return 'USGS';
    if (id.startsWith('noaa-')) return 'NOAA';
    if (id.startsWith('reliefweb-')) return 'ReliefWeb';
    return 'Unknown';
  }

  /**
   * Broadcast update to all connected WebSocket clients
   */
  private broadcastUpdate(type: string, data: unknown): void {
    if (!this.wss) return;

    const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });

    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }

  /**
   * Get last fetched data
   */
  getLastData(): AggregatedData | null {
    return this.lastData;
  }
}

export const dataAggregator = new DataAggregator();
