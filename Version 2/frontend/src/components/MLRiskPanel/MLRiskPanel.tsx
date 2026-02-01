// frontend/src/components/MLRiskPanel/MLRiskPanel.tsx
// ML-Enhanced Risk Analysis Panel

import { useState, useEffect } from 'react';
import { useMLRiskAssessment, useTextAnalysis, useSimilarEvents } from '../../hooks/useMLRisk';

interface MLRiskPanelProps {
  entityId?: string;
  entityType?: 'company' | 'port' | 'country';
  onClose?: () => void;
}

// Risk score color based on value
function getRiskColor(score: number): string {
  if (score >= 7) return 'text-red-400';
  if (score >= 5) return 'text-orange-400';
  if (score >= 3) return 'text-yellow-400';
  return 'text-green-400';
}

function getRiskBgColor(score: number): string {
  if (score >= 7) return 'bg-red-500/20';
  if (score >= 5) return 'bg-orange-500/20';
  if (score >= 3) return 'bg-yellow-500/20';
  return 'bg-green-500/20';
}

// Trend icon
function TrendIcon({ trend }: { trend: 'increasing' | 'stable' | 'decreasing' }) {
  if (trend === 'increasing') {
    return <span className="text-red-400">↑</span>;
  }
  if (trend === 'decreasing') {
    return <span className="text-green-400">↓</span>;
  }
  return <span className="text-gray-400">→</span>;
}

// Source badge
function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    event: 'bg-red-500/30 text-red-300',
    news_sentiment: 'bg-blue-500/30 text-blue-300',
    historical: 'bg-purple-500/30 text-purple-300',
    geopolitical: 'bg-orange-500/30 text-orange-300',
    network: 'bg-cyan-500/30 text-cyan-300',
  };
  
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${colors[source] || 'bg-gray-500/30'}`}>
      {source.replace('_', ' ')}
    </span>
  );
}

export function MLRiskPanel({ entityId, entityType, onClose }: MLRiskPanelProps) {
  const [activeTab, setActiveTab] = useState<'assessment' | 'analyze' | 'similar'>('assessment');
  const [analyzeInput, setAnalyzeInput] = useState('');
  const [similarInput, setSimilarInput] = useState('');
  
  const { assessment, loading: assessLoading, error: assessError, assessRisk } = useMLRiskAssessment();
  const { result: textResult, loading: textLoading, analyzeText } = useTextAnalysis();
  const { events: similarEvents, loading: similarLoading, findSimilar } = useSimilarEvents();

  // Auto-assess when entity changes
  useEffect(() => {
    if (entityId && entityType) {
      assessRisk(entityId, entityType);
    }
  }, [entityId, entityType, assessRisk]);

  const handleAnalyzeText = () => {
    if (analyzeInput.trim()) {
      analyzeText(analyzeInput);
    }
  };

  const handleFindSimilar = () => {
    if (similarInput.trim()) {
      findSimilar(similarInput);
    }
  };

  return (
    <div className="bg-gray-900/95 backdrop-blur border border-gray-700 rounded-lg shadow-xl w-96 max-h-[80vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <h2 className="text-lg font-semibold text-white">ML Risk Analysis</h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('assessment')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'assessment'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Assessment
        </button>
        <button
          onClick={() => setActiveTab('analyze')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'analyze'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Analyze Text
        </button>
        <button
          onClick={() => setActiveTab('similar')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'similar'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Similar Events
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Assessment Tab */}
        {activeTab === 'assessment' && (
          <div className="space-y-4">
            {assessLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
              </div>
            )}
            
            {assessError && (
              <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded">
                {assessError}
              </div>
            )}

            {!entityId && !assessLoading && (
              <div className="text-gray-400 text-center py-8">
                Select an entity on the map to see ML risk analysis
              </div>
            )}

            {assessment && (
              <>
                {/* Risk Score */}
                <div className={`p-4 rounded-lg ${getRiskBgColor(assessment.riskScore)}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-gray-400 text-sm">ML Risk Score</div>
                      <div className={`text-3xl font-bold ${getRiskColor(assessment.riskScore)}`}>
                        {assessment.riskScore.toFixed(1)}
                        <span className="text-lg text-gray-500">/10</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-400 text-sm">7-Day Forecast</div>
                      <div className="flex items-center gap-1">
                        <TrendIcon trend={assessment.trend} />
                        <span className={getRiskColor(assessment.predictedScore7d)}>
                          {assessment.predictedScore7d.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Confidence: {(assessment.confidence * 100).toFixed(0)}%
                  </div>
                </div>

                {/* AI Analysis */}
                {assessment.aiAnalysis && (
                  <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="text-blue-400 text-xs font-medium mb-1">AI Analysis</div>
                    <p className="text-gray-300 text-sm">{assessment.aiAnalysis}</p>
                  </div>
                )}

                {/* Risk Factors */}
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Risk Factors</h3>
                  <div className="space-y-2">
                    {assessment.factors.map((factor, idx) => (
                      <div key={idx} className="bg-gray-800 rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white">{factor.name}</span>
                          <SourceBadge source={factor.source} />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
                            <div
                              className={`h-full ${
                                factor.score >= 7 ? 'bg-red-500' :
                                factor.score >= 5 ? 'bg-orange-500' :
                                factor.score >= 3 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${(factor.score / 10) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-12 text-right">
                            {factor.score.toFixed(1)}/10
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Weight: {(factor.weight * 100).toFixed(0)}% • 
                          Contribution: {factor.contribution.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Analyze Text Tab */}
        {activeTab === 'analyze' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">
                Enter news or event text to analyze for risk signals
              </label>
              <textarea
                value={analyzeInput}
                onChange={(e) => setAnalyzeInput(e.target.value)}
                placeholder="Paste news article, event description, or any supply chain related text..."
                className="w-full h-32 bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleAnalyzeText}
                disabled={textLoading || !analyzeInput.trim()}
                className="mt-2 w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
              >
                {textLoading ? 'Analyzing...' : 'Analyze Risk Sentiment'}
              </button>
            </div>

            {textResult && (
              <div className="space-y-3">
                {/* Risk Level */}
                <div className={`p-3 rounded ${getRiskBgColor(textResult.riskScore)}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Risk Level</span>
                    <span className={`font-bold uppercase ${getRiskColor(textResult.riskScore)}`}>
                      {textResult.riskLevel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-gray-400 text-sm">Score</span>
                    <span className={getRiskColor(textResult.riskScore)}>
                      {textResult.riskScore.toFixed(1)}/10
                    </span>
                  </div>
                </div>

                {/* Sentiment Details */}
                <div className="bg-gray-800 rounded p-3">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Sentiment Analysis</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400">Score:</span>
                      <span className={`ml-2 ${textResult.sentiment.score < 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {textResult.sentiment.score.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Confidence:</span>
                      <span className="ml-2 text-white">
                        {(textResult.sentiment.magnitude * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Risk Aspects */}
                {textResult.sentiment.aspects.length > 0 && (
                  <div className="bg-gray-800 rounded p-3">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Detected Risk Signals</h4>
                    <div className="flex flex-wrap gap-2">
                      {textResult.sentiment.aspects.map((aspect, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 rounded text-xs ${
                            aspect.sentiment < 0
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-green-500/20 text-green-300'
                          }`}
                        >
                          {aspect.topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Similar Events Tab */}
        {activeTab === 'similar' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">
                Find historical events similar to this event
              </label>
              <input
                type="text"
                value={similarInput}
                onChange={(e) => setSimilarInput(e.target.value)}
                placeholder="Enter event title or description..."
                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleFindSimilar}
                disabled={similarLoading || !similarInput.trim()}
                className="mt-2 w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
              >
                {similarLoading ? 'Searching...' : 'Find Similar Events'}
              </button>
            </div>

            {similarEvents.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300">
                  Similar Historical Events
                </h4>
                {similarEvents.map((event, idx) => (
                  <div key={idx} className="bg-gray-800 rounded p-3">
                    <div className="text-sm text-white mb-1">{event.title}</div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        Similarity: {(event.similarity * 100).toFixed(0)}%
                      </span>
                      <span className={getRiskColor(event.severity)}>
                        Severity: {event.severity}/10
                      </span>
                    </div>
                    <div className="mt-2 h-1 bg-gray-700 rounded overflow-hidden">
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${event.similarity * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MLRiskPanel;
