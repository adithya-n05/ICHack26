// backend/src/services/gdelt.ts
export interface GdeltEvent {
  id: string;
  type: string;
  title: string;
  location: { lat: number; lng: number };
  severity: number;
  startDate: string;
  source: string;
  url?: string;
}

export async function fetchGdeltEvents(): Promise<GdeltEvent[]> {
  try {
    const query = encodeURIComponent('semiconductor OR chip OR supply chain OR TSMC OR Samsung');
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=50&format=json`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error('GDELT API error:', response.status);
      return [];
    }

    const data = await response.json() as { articles?: any[] };
    return data.articles || [];
  } catch (error) {
    console.error('GDELT fetch error:', error);
    return [];
  }
}
