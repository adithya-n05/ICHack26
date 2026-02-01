/**
 * SimulationChat - AI-powered "what-if" scenario simulation interface
 *
 * Following Context7 React hooks best practices:
 * - useEffect with proper cleanup
 * - useCallback for event handlers
 * - Ref patterns for scroll management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../../store';
import type { ChatMessage, SupplyRoute } from '../../types';

interface SimulationChatProps {
  className?: string;
}

// API configuration
const PYTHON_API_URL = 'http://localhost:3002';

export function SimulationChat({ className = '' }: SimulationChatProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Store access
  const chatMessages = useStore((state) => state.chatMessages);
  const addChatMessage = useStore((state) => state.addChatMessage);
  const setSimulationActive = useStore((state) => state.setSimulationActive);
  const setSimulatedRoutes = useStore((state) => state.setSimulatedRoutes);
  const routes = useStore((state) => state.routes);

  // Auto-scroll to bottom when messages change (Context7: useEffect with dependency)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Cleanup abort controller on unmount (Context7: cleanup pattern)
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Process simulation response and update map state
  const processSimulationResult = useCallback((response: string) => {
    // Extract affected routes and update their status
    const affectedRouteIds = extractAffectedRoutes(response);

    if (affectedRouteIds.length > 0) {
      // Create simulated routes with updated risk scores
      const simulatedRoutes: SupplyRoute[] = routes
        .filter(r => affectedRouteIds.includes(r.id))
        .map(r => ({
          ...r,
          status: 'disrupted' as const,
          riskScore: Math.min(100, r.riskScore + 25),
          isSimulated: true,
        }));

      setSimulatedRoutes(simulatedRoutes);
      setSimulationActive(true);
    }
  }, [routes, setSimulatedRoutes, setSimulationActive]);

  // Extract route IDs from response text
  const extractAffectedRoutes = (text: string): string[] => {
    const routePatterns = ['tsmc-shenzhen', 'shanghai-la', 'shanghai-rotterdam', 'taiwan-japan'];
    return routePatterns.filter(id =>
      text.toLowerCase().includes(id.replace('-', ' ')) ||
      text.toLowerCase().includes(id)
    );
  };

  // Submit simulation query (Context7: useCallback for handlers)
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      isSimulation: true,
    };

    addChatMessage(userMessage);
    setInput('');
    setIsLoading(true);
    setError(null);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${PYTHON_API_URL}/api/simulate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: input }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Simulation failed: ${response.statusText}`);
      }

      const result = await response.json();

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
        isSimulation: true,
      };

      addChatMessage(assistantMessage);
      processSimulationResult(result.response);

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled, don't show error
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);

      // Add fallback response using local simulation
      const fallbackResponse = generateLocalSimulation(input);
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: fallbackResponse,
        timestamp: new Date(),
        isSimulation: true,
      };
      addChatMessage(assistantMessage);
      processSimulationResult(fallbackResponse);

    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [input, isLoading, addChatMessage, processSimulationResult]);

  // Generate local simulation when API is unavailable
  const generateLocalSimulation = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('tariff') || lowerQuery.includes('taiwan')) {
      return `**Simulation Analysis: ${query}**

**Affected Routes:** 2 routes identified
  - tsmc-shenzhen: Risk increased by 18.5%
  - shanghai-la: Risk increased by 12.3%

**Recommended Alternatives:**
  1. Samsung Foundry (South Korea) - Risk: 23%, Cost: +8%
  2. Intel Foundry Services (USA) - Risk: 12%, Cost: +22%
  3. GlobalFoundries Dresden (Germany) - Risk: 18%, Cost: +15%

**Overall Impact:** Average risk increase of 15.4%
**Recommendation:** Immediate action recommended to diversify supply chain`;
    }

    if (lowerQuery.includes('earthquake') || lowerQuery.includes('disaster')) {
      return `**Simulation Analysis: ${query}**

**Affected Routes:** 1 route identified
  - tsmc-shenzhen: Risk increased by 25.0%

**Recommended Alternatives:**
  1. Samsung Foundry (South Korea) - Risk: 23%, Cost: +8%
  2. GlobalFoundries Dresden (Germany) - Risk: 18%, Cost: +15%

**Overall Impact:** Average risk increase of 25.0%
**Recommendation:** Immediate action recommended to diversify supply chain`;
    }

    if (lowerQuery.includes('red sea') || lowerQuery.includes('conflict')) {
      return `**Simulation Analysis: ${query}**

**Affected Routes:** 1 route identified
  - shanghai-rotterdam: Risk increased by 22.0%

**Recommended Alternatives:**
  1. Reroute via Cape of Good Hope (+14 days)
  2. Air freight partial shipments (+180% cost)

**Overall Impact:** Average risk increase of 22.0%
**Recommendation:** Monitor situation and prepare contingency plans`;
    }

    return `**Simulation Analysis: ${query}**

**Analysis:** Running scenario simulation...

Based on current supply chain data:
- 7 active routes monitored
- 6 risk zones detected
- 3 alternative suppliers available

**Recommendation:** Maintain current monitoring levels`;
  };

  // Reset simulation
  const handleReset = useCallback(() => {
    setSimulatedRoutes([]);
    setSimulationActive(false);
  }, [setSimulatedRoutes, setSimulationActive]);

  // Quick simulation prompts
  const quickPrompts = [
    'What if 50% tariff on Taiwan semiconductors?',
    'What if earthquake disrupts Japan ports?',
    'What if Red Sea conflict continues 6 months?',
  ];

  return (
    <div className={`flex flex-col h-full bg-[#0a0c10] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
            AI Simulation
          </span>
        </div>
        {chatMessages.length > 0 && (
          <button
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700">
        {chatMessages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm mb-4">
              Ask "what-if" questions to simulate supply chain scenarios
            </p>
            <div className="space-y-2">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="block w-full text-left px-3 py-2 text-xs text-gray-400 bg-gray-800/50 rounded border border-gray-700 hover:border-cyan-400/50 hover:text-cyan-400 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-cyan-400/20 text-cyan-100 border border-cyan-400/30'
                    : 'bg-gray-800 text-gray-200 border border-gray-700'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="whitespace-pre-wrap font-mono text-xs">
                    {formatSimulationResponse(msg.content)}
                  </div>
                ) : (
                  <span>{msg.content}</span>
                )}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-lg px-4 py-3 border border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs text-gray-400 font-mono">
                  Running simulation...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-amber-400/10 border-t border-amber-400/30">
          <p className="text-xs text-amber-400 font-mono">
            Using local simulation (API unavailable)
          </p>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What if..."
            disabled={isLoading}
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-400/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 rounded text-sm font-medium hover:bg-cyan-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '...' : 'Run'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Format simulation response with styling
function formatSimulationResponse(content: string): React.ReactNode {
  // Parse markdown-like formatting
  const lines = content.split('\n');

  return lines.map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      // Bold header
      return (
        <div key={i} className="text-cyan-400 font-semibold mt-2 first:mt-0">
          {line.replace(/\*\*/g, '')}
        </div>
      );
    }
    if (line.includes('**') && line.includes(':')) {
      // Inline bold label
      const parts = line.split('**');
      return (
        <div key={i} className="mt-1">
          {parts.map((part, j) => (
            j % 2 === 1 ? (
              <span key={j} className="text-gray-300 font-medium">{part}</span>
            ) : (
              <span key={j}>{part}</span>
            )
          ))}
        </div>
      );
    }
    if (line.trim().startsWith('-') || line.trim().match(/^\d+\./)) {
      // List item
      return (
        <div key={i} className="text-gray-400 ml-2">
          {line}
        </div>
      );
    }
    return <div key={i}>{line}</div>;
  });
}

export default SimulationChat;
