import { create } from 'zustand';
import type { ImpactAnalysis, NewsHeadline } from '@/types';
import { impactMappings, mockNews } from '@/data/mockSupplyChain';

interface AppState {
  // Map state
  selectedRoute: string | null;
  selectedNode: string | null;
  impactedRoutes: string[];
  impactedSuppliers: string[];

  // Query state
  currentQuery: string;
  isAnalyzing: boolean;
  impactAnalysis: ImpactAnalysis | null;

  // News
  headlines: NewsHeadline[];

  // Panels
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  // Actions
  setSelectedRoute: (routeId: string | null) => void;
  setSelectedNode: (nodeId: string | null) => void;
  analyzeQuery: (query: string) => Promise<void>;
  clearImpact: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  selectedRoute: null,
  selectedNode: null,
  impactedRoutes: [],
  impactedSuppliers: [],
  currentQuery: '',
  isAnalyzing: false,
  impactAnalysis: null,
  headlines: mockNews,
  leftPanelOpen: true,
  rightPanelOpen: true,

  // Actions
  setSelectedRoute: (routeId) => set({ selectedRoute: routeId }),
  setSelectedNode: (nodeId) => set({ selectedNode: nodeId }),

  analyzeQuery: async (query: string) => {
    set({ isAnalyzing: true, currentQuery: query });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Find matching impact based on keywords
    const lowerQuery = query.toLowerCase();
    let impact = { routes: [] as string[], suppliers: [] as string[], summary: '' };

    for (const [keyword, mapping] of Object.entries(impactMappings)) {
      if (lowerQuery.includes(keyword)) {
        impact = mapping;
        break;
      }
    }

    // Default impact if no match
    if (impact.routes.length === 0) {
      impact = {
        routes: ['route-tsmc-apple', 'route-asml-tsmc'],
        suppliers: ['tsmc-taiwan'],
        summary: `Analysis of "${query}": Potential supply chain disruption detected. Taiwan semiconductor routes show elevated risk. Recommend monitoring closely and preparing contingency suppliers.`,
      };
    }

    const analysis: ImpactAnalysis = {
      query,
      affectedRoutes: impact.routes,
      affectedSuppliers: impact.suppliers,
      riskLevel: Math.floor(Math.random() * 30) + 60,
      summary: impact.summary,
      headlines: mockNews.slice(0, 3),
    };

    set({
      isAnalyzing: false,
      impactAnalysis: analysis,
      impactedRoutes: impact.routes,
      impactedSuppliers: impact.suppliers,
    });
  },

  clearImpact: () => set({
    impactedRoutes: [],
    impactedSuppliers: [],
    impactAnalysis: null,
    currentQuery: '',
  }),

  toggleLeftPanel: () => set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),
  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
}));
