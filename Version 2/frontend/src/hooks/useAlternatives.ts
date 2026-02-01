import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface AlternativeSupplier {
  id: string;
  name: string;
  country?: string;
  city?: string;
  lat?: number | null;
  lng?: number | null;
  location?: { lat: number; lng: number };
}

export function useAlternatives(material: string | null) {
  const [alternatives, setAlternatives] = useState<AlternativeSupplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!material) {
      setAlternatives([]);
      setLoading(false);
      setError(null);
      return () => {
        isMounted = false;
      };
    }

    setLoading(true);
    setError(null);

    fetch(`${API_URL}/api/alternatives?material=${encodeURIComponent(material)}`)
      .then((res) => res.json())
      .then((data: AlternativeSupplier[]) => {
        if (!isMounted) return;
        setAlternatives(data || []);
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
  }, [material]);

  return { alternatives, loading, error };
}
