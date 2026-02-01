import { useEffect, useState } from 'react';

interface SupplyPath {
  id: string;
  companyId?: string;
  company_id?: string;
  productCategory?: string;
  product_category?: string;
  status: string;
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
  status: string;
  isUserConnection?: boolean;
  is_user_connection?: boolean;
  materials?: string[];
  description?: string;
  leadTimeDays?: number;
  lead_time_days?: number;
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
        setPath(data?.path ?? null);
        setEdges(Array.isArray(data?.edges) ? data.edges : []);
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

  if (!companyId) {
    return { path: null, edges: [], loading: false, error: null };
  }

  return { path, edges, loading, error };
}
