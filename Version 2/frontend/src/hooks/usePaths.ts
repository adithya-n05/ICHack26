import { useEffect, useState } from 'react';

interface SupplyPath {
  id: string;
  companyId?: string;
  company_id?: string;
  productCategory?: string;
  product_category?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PathEdge {
  id: string;
  fromNodeId?: string;
  toNodeId?: string;
  from_node_id?: string;
  to_node_id?: string;
  transportMode?: string;
  transport_mode?: string;
  status?: string;
  isUserConnection?: boolean;
  is_user_connection?: boolean;
  materials?: string[];
  description?: string;
  leadTimeDays?: number;
  lead_time_days?: number;
  costScore?: number;
  cost_score?: number;
  riskScore?: number;
  risk_score?: number;
  tariffCost?: number;
  tariff_cost?: number;
  pathId?: string;
  path_id?: string;
  sequence?: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function usePaths(companyId?: string | null) {
  const [path, setPath] = useState<SupplyPath | null>(null);
  const [edges, setEdges] = useState<PathEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!companyId) {
      setPath(null);
      setEdges([]);
      setLoading(false);
      setError(null);
      return () => {
        isMounted = false;
      };
    }

    const fetchPaths = async () => {
      if (isMounted) {
        setLoading(true);
        setError(null);
      }

      try {
        const res = await fetch(`${API_URL}/api/paths?company_id=${companyId}`);
        if (res.status === 404) {
          if (isMounted) {
            setPath(null);
            setEdges([]);
            setLoading(false);
          }
          return;
        }
        if (!res.ok) {
          throw new Error(`Failed to load paths (${res.status})`);
        }
        const data = await res.json();
        if (!isMounted) return;
        const nextPath = data?.path
          ? {
            id: data.path.id,
            companyId: data.path.companyId ?? data.path.company_id,
            company_id: data.path.company_id,
            productCategory: data.path.productCategory ?? data.path.product_category,
            product_category: data.path.product_category,
            status: data.path.status,
            createdAt: data.path.createdAt ?? data.path.created_at,
            updatedAt: data.path.updatedAt ?? data.path.updated_at,
          }
          : null;
        const nextEdges = (data?.edges || []).map((edge: any) => ({
          id: edge.id,
          fromNodeId: edge.fromNodeId ?? edge.from_node_id,
          toNodeId: edge.toNodeId ?? edge.to_node_id,
          from_node_id: edge.from_node_id,
          to_node_id: edge.to_node_id,
          transportMode: edge.transportMode ?? edge.transport_mode,
          transport_mode: edge.transport_mode,
          status: edge.status ?? data?.path?.status,
          isUserConnection: edge.isUserConnection ?? edge.is_user_connection,
          is_user_connection: edge.is_user_connection,
          materials: edge.materials,
          description: edge.description,
          leadTimeDays: edge.leadTimeDays ?? edge.lead_time_days,
          lead_time_days: edge.lead_time_days,
          costScore: edge.costScore ?? edge.cost_score,
          cost_score: edge.cost_score,
          riskScore: edge.riskScore ?? edge.risk_score,
          risk_score: edge.risk_score,
          tariffCost: edge.tariffCost ?? edge.tariff_cost,
          tariff_cost: edge.tariff_cost,
          pathId: edge.pathId ?? edge.path_id,
          path_id: edge.path_id,
          sequence: edge.sequence,
        }));
        setPath(nextPath);
        setEdges(nextEdges);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        setError((err as Error).message);
        setLoading(false);
      }
    };

    fetchPaths();

    return () => {
      isMounted = false;
    };
  }, [companyId]);

  return { path, edges, loading, error };
}
