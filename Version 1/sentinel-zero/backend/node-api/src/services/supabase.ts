/**
 * Supabase client for Sentinel-Zero
 * Handles database operations for supply chain data persistence
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Database types
export interface DbNode {
  id: string;
  name: string;
  type: string;
  coordinates: { type: 'Point'; coordinates: [number, number] };
  country: string | null;
  country_code: string | null;
  risk_score: number;
  metadata: Record<string, unknown>;
}

export interface DbRoute {
  id: string;
  name: string | null;
  source_id: string;
  destination_id: string;
  transport_mode: string | null;
  status: string;
  risk_score: number;
}

export interface DbRiskEvent {
  id: string;
  type: string;
  coordinates: string | { type: 'Point'; coordinates: [number, number] }; // PostGIS point or WKT string
  intensity: number;
  radius_km: number;
  description: string | null;
  source: string | null;
  expires_at: string | null;
  created_at?: string;
}

export interface DbNews {
  id: string;
  title: string;
  source: string | null;
  severity: string | null;
  region: string | null;
  impact_score: number | null;
  url: string | null;
  created_at: string;
}

export interface DbVessel {
  id: string;
  mmsi: string;
  name: string | null;
  coordinates: { type: 'Point'; coordinates: [number, number] };
  heading: number | null;
  speed: number | null;
  destination: string | null;
  updated_at: string;
}

class SupabaseService {
  private client: SupabaseClient | null = null;

  initialize(): SupabaseClient {
    if (this.client) return this.client;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;

    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_KEY environment variables');
    }

    this.client = createClient(url, key);
    console.log('Supabase client initialized');
    return this.client;
  }

  getClient(): SupabaseClient {
    if (!this.client) {
      return this.initialize();
    }
    return this.client;
  }

  // Risk Events Operations
  async upsertRiskEvents(events: Partial<DbRiskEvent>[]): Promise<void> {
    const client = this.getClient();

    const { error } = await client
      .from('risk_events')
      .upsert(events, { onConflict: 'id' });

    if (error) {
      console.error('Error upserting risk events:', error);
      throw error;
    }
  }

  async getRiskEvents(): Promise<DbRiskEvent[]> {
    const client = this.getClient();

    const { data, error } = await client
      .from('risk_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching risk events:', error);
      throw error;
    }

    return data || [];
  }

  // News Operations
  async upsertNews(news: Partial<DbNews>[]): Promise<void> {
    const client = this.getClient();

    const { error } = await client
      .from('news')
      .upsert(news, { onConflict: 'id' });

    if (error) {
      console.error('Error upserting news:', error);
      throw error;
    }
  }

  async getNews(limit = 50): Promise<DbNews[]> {
    const client = this.getClient();

    const { data, error } = await client
      .from('news')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching news:', error);
      throw error;
    }

    return data || [];
  }

  // Vessel Operations
  async upsertVessels(vessels: Partial<DbVessel>[]): Promise<void> {
    const client = this.getClient();

    const { error } = await client
      .from('vessels')
      .upsert(vessels, { onConflict: 'mmsi' });

    if (error) {
      console.error('Error upserting vessels:', error);
      throw error;
    }
  }

  async getVessels(): Promise<DbVessel[]> {
    const client = this.getClient();

    const { data, error } = await client
      .from('vessels')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Error fetching vessels:', error);
      throw error;
    }

    return data || [];
  }

  // Node Operations
  async upsertNodes(nodes: Partial<DbNode>[]): Promise<void> {
    const client = this.getClient();

    const { error } = await client
      .from('nodes')
      .upsert(nodes, { onConflict: 'id' });

    if (error) {
      console.error('Error upserting nodes:', error);
      throw error;
    }
  }

  async getNodes(): Promise<DbNode[]> {
    const client = this.getClient();

    const { data, error } = await client
      .from('nodes')
      .select('*');

    if (error) {
      console.error('Error fetching nodes:', error);
      throw error;
    }

    return data || [];
  }

  // Route Operations
  async upsertRoutes(routes: Partial<DbRoute>[]): Promise<void> {
    const client = this.getClient();

    const { error } = await client
      .from('routes')
      .upsert(routes, { onConflict: 'id' });

    if (error) {
      console.error('Error upserting routes:', error);
      throw error;
    }
  }

  async getRoutes(): Promise<DbRoute[]> {
    const client = this.getClient();

    const { data, error } = await client
      .from('routes')
      .select('*');

    if (error) {
      console.error('Error fetching routes:', error);
      throw error;
    }

    return data || [];
  }
}

export const supabaseService = new SupabaseService();
