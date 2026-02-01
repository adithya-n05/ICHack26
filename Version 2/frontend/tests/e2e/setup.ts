/**
 * Test utilities and setup for risk agent E2E tests
 */

export const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001';

export interface TestEvent {
  id: string;
  type: string;
  title: string;
  description: string;
}

/**
 * Wait for a condition with timeout
 */
export const waitFor = async <T>(
  condition: () => Promise<T | null>,
  timeoutMs = 30000,
  intervalMs = 1000
): Promise<T | null> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await condition();
    if (result) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return null;
};

/**
 * Check if services are running
 */
export const checkServices = async () => {
  const services = {
    backend: false,
    riskAgent: false,
    redis: false,
  };

  try {
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      services.backend = health.status === 'ok';
      services.redis = health.redis === 'connected';
    }
  } catch (error) {
    console.error('Backend health check failed:', error);
  }

  try {
    const riskHealthResponse = await fetch('http://localhost:8000/health');
    services.riskAgent = riskHealthResponse.ok;
  } catch (error) {
    // Risk agent not running
  }

  return services;
};

/**
 * Get an existing event from the database
 */
export const getTestEvent = async (): Promise<TestEvent | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/events?limit=1`);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.events && data.events.length > 0) {
      return data.events[0];
    }
  } catch (error) {
    console.error('Failed to get test event:', error);
  }

  return null;
};

/**
 * Trigger risk assessment for an event
 */
export const triggerRiskAssessment = async (eventId: string): Promise<boolean> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/internal/events/notify/${eventId}`,
      { method: 'POST' }
    );

    if (!response.ok) return false;

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Failed to trigger risk assessment:', error);
    return false;
  }
};

/**
 * Get risk assessment for an event (with retries)
 */
export const getRiskAssessment = async (
  eventId: string,
  maxAttempts = 30
): Promise<any | null> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/risk/event/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.assessment) {
          return data.assessment;
        }
      }
    } catch (error) {
      console.error('Error fetching risk assessment:', error);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return null;
};
