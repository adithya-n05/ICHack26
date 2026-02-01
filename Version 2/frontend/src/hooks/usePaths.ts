import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface SupplyPath {
  id: string;
  companyId?: string;
  productCategory?: string;
  status?: string;
}

export interface PathEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  status?: string;
  costScore?: number;
  riskScore?: number;
  tariffCost?: number;
  transportMode?: string;
  leadTimeDays?: number;
  sequence?: number;
}

interface PathsResponse {
  path: any;
  edges: any[];
}

export function usePaths(companyId: string | null) {
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

    setLoading(true);
    setError(null);

    fetch(`${API_URL}/api/paths?company_id=${companyId}`)
      .then((res) => res.json())
      .then((data: PathsResponse) => {
        if (!isMounted) return;
        const nextPath = data?.path
          ? {
              id: data.path.id,
              companyId: data.path.companyId ?? data.path.company_id,
              productCategory: data.path.productCategory ?? data.path.product_category,
              status: data.path.status,
            }
          : null;

        const nextEdges = (data?.edges || []).map((edge: any) => ({
          id: edge.id,
          fromNodeId: edge.fromNodeId ?? edge.from_node_id,
          toNodeId: edge.toNodeId ?? edge.to_node_id,
          status: edge.status ?? data?.path?.status,
          costScore: edge.costScore ?? edge.cost_score,
          riskScore: edge.riskScore ?? edge.risk_score,
          tariffCost: edge.tariffCost ?? edge.tariff_cost,
          transportMode: edge.transportMode ?? edge.transport_mode,
          leadTimeDays: edge.leadTimeDays ?? edge.lead_time_days,
          sequence: edge.sequence,
        }));

        setPath(nextPath);
        setEdges(nextEdges);
        setLoading(false);
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [companyId]);

  return { path, edges, loading, error };
}
