import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { getConnectionRisk } from '../services/connectionRisk';
import { messageBus } from '../agents/messageBus';
import { findAlternativeRoutes } from '../services/mitigationAgent';
import { findReroutingAlternatives } from '../services/rerouting';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { status, fromNodeId, toNodeId, isUserConnection } = req.query;

    let query = supabase.from('connections').select('*');

    if (status) {
      query = query.eq('status', status);
    }

    if (fromNodeId) {
      query = query.eq('from_node_id', fromNodeId);
    }

    if (toNodeId) {
      query = query.eq('to_node_id', toNodeId);
    }

    if (isUserConnection !== undefined) {
      query = query.eq('is_user_connection', isUserConnection === 'true');
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Transform DB fields to camelCase for frontend
    const transformed = (data || []).map((conn: any) => ({
      id: conn.id,
      fromNodeId: conn.from_node_id,
      toNodeId: conn.to_node_id,
      transportMode: conn.transport_mode,
      status: conn.status,
      isUserConnection: conn.is_user_connection,
      materials: conn.materials,
      description: conn.description,
      leadTimeDays: conn.lead_time_days,
      // Keep snake_case versions for backward compatibility
      from_node_id: conn.from_node_id,
      to_node_id: conn.to_node_id,
      transport_mode: conn.transport_mode,
      is_user_connection: conn.is_user_connection,
      lead_time_days: conn.lead_time_days,
    }));

    res.json(transformed);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/connections/:id/risk - Get detailed risk assessment for a connection
router.get('/:id/risk', async (req, res) => {
  try {
    const { id } = req.params;

    const riskDetails = await getConnectionRisk(id);

    if (!riskDetails) {
      return res.status(404).json({ error: 'Connection not found or missing location data' });
    }

    // Notify agents about risk query (for tracking/learning)
    if (riskDetails.riskScore >= 50) {
      messageBus.publish({
        type: 'HIGH_RISK_DETECTED',
        fromAgent: 'api-gateway',
        toAgent: 'orchestrator',
        payload: {
          entity: { id, type: 'connection' },
          riskScore: {
            entityId: id,
            entityType: 'route',
            riskScore: riskDetails.riskScore,
            riskLevel: riskDetails.status,
          },
          source: 'user-query',
        },
        priority: riskDetails.riskScore >= 75 ? 'critical' : 'high',
        requiresAck: false,
      });
    }

    res.json(riskDetails);
  } catch (err) {
    console.error('Connection risk error:', err);
    res.status(500).json({ error: 'Failed to calculate connection risk' });
  }
});

// GET /api/connections/:id/mitigation - Get mitigation plan for a connection
router.get('/:id/mitigation', async (req, res) => {
  try {
    const { id } = req.params;

    // First get the connection details
    const { data: connection, error: connError } = await supabase
      .from('connections')
      .select('*')
      .eq('id', id)
      .single();

    if (connError || !connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Get current risk details
    const riskDetails = await getConnectionRisk(id);
    
    // Find alternative routes
    let alternativeRoutes: any[] = [];
    try {
      const rerouteResult = await findReroutingAlternatives(
        connection.from_node_id,
        connection.to_node_id,
        { optimizeFor: 'risk', maxRiskThreshold: 0.5, maxHops: 5 }
      );
      alternativeRoutes = rerouteResult?.alternatives || [];
    } catch (err) {
      console.warn('Could not find rerouting alternatives:', err);
    }

    // Generate mitigation actions based on risk
    const actions: any[] = [];
    
    if (riskDetails && riskDetails.riskScore >= 75) {
      actions.push({
        id: 'immediate-reroute',
        type: 'immediate',
        priority: 'critical',
        title: 'Consider Immediate Rerouting',
        description: 'This route has critical risk. Evaluate alternative paths or transport modes.',
        estimatedImpact: 30,
        timeToImplement: '1-3 days',
      });
    }

    if (riskDetails && riskDetails.riskScore >= 50) {
      actions.push({
        id: 'monitor-closely',
        type: 'immediate',
        priority: 'high',
        title: 'Increase Monitoring',
        description: 'Set up real-time tracking and alerts for shipments on this route.',
        estimatedImpact: 10,
        timeToImplement: 'Immediate',
      });
      
      actions.push({
        id: 'backup-inventory',
        type: 'short-term',
        priority: 'high',
        title: 'Build Buffer Inventory',
        description: 'Increase safety stock for materials transported via this route.',
        estimatedImpact: 15,
        timeToImplement: '1-2 weeks',
      });
    }

    if (riskDetails?.relatedEvents?.some((e: any) => e.type === 'weather' || e.type === 'natural_disaster')) {
      actions.push({
        id: 'weather-contingency',
        type: 'short-term',
        priority: 'medium',
        title: 'Weather Contingency Plan',
        description: 'Prepare for weather-related delays. Consider alternative transport modes.',
        estimatedImpact: 20,
        timeToImplement: '3-5 days',
      });
    }

    if (connection.transport_mode === 'sea') {
      actions.push({
        id: 'multimodal',
        type: 'long-term',
        priority: 'medium',
        title: 'Evaluate Air Freight Option',
        description: 'For time-critical shipments, consider partial air freight as backup.',
        estimatedImpact: 15,
        estimatedCost: 'High',
        timeToImplement: '1-2 weeks',
      });
    }

    // Build response
    const mitigationPlan = {
      entityId: id,
      entityName: `${connection.from_node_id} → ${connection.to_node_id}`,
      entityType: 'route',
      currentRisk: riskDetails ? {
        entityId: id,
        entityType: 'route',
        entityName: `${connection.from_node_id} → ${connection.to_node_id}`,
        riskLevel: riskDetails.status,
        riskScore: riskDetails.riskScore,
        factors: riskDetails.factors || [],
        trend: 'stable',
        prediction7d: riskDetails.riskScore + 5,
        prediction30d: riskDetails.riskScore + 10,
        updatedAt: riskDetails.lastUpdated,
      } : null,
      actions,
      alternativeSuppliers: [], // Routes don't have supplier alternatives
      alternativeRoutes: alternativeRoutes.map((r: any) => ({
        path: r.path?.map((p: any) => p.name || p.id) || [],
        totalDistance: r.totalDistance || 0,
        estimatedTime: r.estimatedTime || 0,
        riskScore: Math.round((r.riskScore || 0.5) * 100),
      })),
      estimatedRiskReduction: actions.reduce((sum, a) => sum + (a.estimatedImpact || 0), 0),
      generatedAt: new Date().toISOString(),
    };

    // Notify agents
    messageBus.publish({
      type: 'REQUEST_MITIGATION',
      fromAgent: 'api-gateway',
      toAgent: 'mitigation-agent',
      payload: {
        entityId: id,
        entityType: 'route',
        source: 'user-request',
      },
      priority: 'normal',
      requiresAck: false,
    });

    res.json(mitigationPlan);
  } catch (err) {
    console.error('Mitigation plan error:', err);
    res.status(500).json({ error: 'Failed to generate mitigation plan' });
  }
});

export default router;
