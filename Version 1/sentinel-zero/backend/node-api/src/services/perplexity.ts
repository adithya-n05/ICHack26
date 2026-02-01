/**
 * Perplexity API Service
 * AI-powered industry news and analysis
 * Uses the API key provided by the user
 */

import axios from 'axios';

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
}

export interface IndustryNews {
  id: string;
  title: string;
  summary: string;
  source: string;
  severity: 'critical' | 'warning' | 'info' | 'positive';
  region: string;
  impactScore: number;
  timestamp: Date;
}

export class PerplexityService {
  private baseUrl = 'https://api.perplexity.ai/chat/completions';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || '';
    if (!this.apiKey) {
      console.warn('PERPLEXITY_API_KEY not set - Perplexity service will be disabled');
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Fetch supply chain industry news using Perplexity AI
   */
  async fetchSupplyChainNews(): Promise<IndustryNews[]> {
    if (!this.isConfigured()) {
      console.log('Perplexity not configured, skipping...');
      return [];
    }

    try {
      const messages: PerplexityMessage[] = [
        {
          role: 'system',
          content: `You are a supply chain intelligence analyst. Return ONLY a JSON array of the top 5 most impactful supply chain news from the last 24 hours. Each item must have these exact fields:
{
  "title": "Brief headline",
  "summary": "2-3 sentence summary",
  "region": "Geographic region affected",
  "severity": "critical|warning|info|positive",
  "impactScore": 0-100
}
Focus on: semiconductor supply, shipping disruptions, tariffs, natural disasters affecting logistics, geopolitical events affecting trade.
Return ONLY the JSON array, no other text.`,
        },
        {
          role: 'user',
          content: 'What are the most important supply chain and logistics news stories from the last 24 hours that could impact global semiconductor and electronics manufacturing?',
        },
      ];

      const response = await axios.post<PerplexityResponse>(
        this.baseUrl,
        {
          model: 'llama-3.1-sonar-small-128k-online',
          messages,
          max_tokens: 1500,
          temperature: 0.2,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        return [];
      }

      // Parse JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('Could not parse Perplexity response as JSON');
        return [];
      }

      const newsItems = JSON.parse(jsonMatch[0]);

      return newsItems.map((item: {
        title: string;
        summary: string;
        region: string;
        severity: string;
        impactScore: number;
      }, index: number) => ({
        id: `perplexity-${Date.now()}-${index}`,
        title: item.title,
        summary: item.summary,
        source: 'Perplexity AI',
        severity: this.validateSeverity(item.severity),
        region: item.region || 'Global',
        impactScore: Math.min(100, Math.max(0, item.impactScore || 50)),
        timestamp: new Date(),
      }));
    } catch (error) {
      console.error('Error fetching Perplexity news:', error);
      return [];
    }
  }

  /**
   * Ask Perplexity for supply chain risk analysis
   */
  async analyzeRisk(query: string): Promise<string> {
    if (!this.isConfigured()) {
      return 'Perplexity AI not configured';
    }

    try {
      const messages: PerplexityMessage[] = [
        {
          role: 'system',
          content: 'You are a supply chain risk analyst. Provide concise, actionable analysis of supply chain risks and disruptions. Focus on quantitative impacts when possible.',
        },
        {
          role: 'user',
          content: query,
        },
      ];

      const response = await axios.post<PerplexityResponse>(
        this.baseUrl,
        {
          model: 'llama-3.1-sonar-small-128k-online',
          messages,
          max_tokens: 1000,
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.choices[0]?.message?.content || 'No analysis available';
    } catch (error) {
      console.error('Error analyzing risk with Perplexity:', error);
      throw error;
    }
  }

  private validateSeverity(severity: string): 'critical' | 'warning' | 'info' | 'positive' {
    const valid = ['critical', 'warning', 'info', 'positive'];
    return valid.includes(severity) ? severity as 'critical' | 'warning' | 'info' | 'positive' : 'info';
  }
}
