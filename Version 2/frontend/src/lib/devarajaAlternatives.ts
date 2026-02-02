export const DEVARAJA_MARKET_ID = 'market-devaraja-market';

type NodeLocation = { lat: number; lng: number };

export type NodeLike = {
  id: string;
  name: string;
  type: string;
  location?: NodeLocation;
  lat?: number | null;
  lng?: number | null;
};

export type UserConnectionLike = {
  id: string;
  from_node_id: string;
  to_node_id: string;
  is_user_connection: boolean;
};

export type DevarajaAlternative = NodeLike & {
  originConnectionId: string;
  originFromNodeId: string;
};

export type DevarajaAlternativePath = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  originConnectionId: string;
};

const getNodeLocation = (node: NodeLike): NodeLocation | null => {
  if (node.location) return node.location;
  if (typeof node.lat === 'number' && typeof node.lng === 'number') {
    return { lat: node.lat, lng: node.lng };
  }
  return null;
};

const distanceKm = (a: NodeLocation, b: NodeLocation) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const buildDevarajaAlternatives = (
  nodes: NodeLike[],
  userConnections: UserConnectionLike[],
  limit: number = 4,
) => {
  const devarajaNode = nodes.find((node) => node.id === DEVARAJA_MARKET_ID);
  const devarajaLocation = devarajaNode ? getNodeLocation(devarajaNode) : null;
  if (!devarajaLocation) {
    return { alternatives: [] as DevarajaAlternative[], paths: [] as DevarajaAlternativePath[] };
  }

  const candidateMarkets = nodes
    .filter((node) => node.type === 'market' && node.id !== DEVARAJA_MARKET_ID)
    .map((node) => ({ node, location: getNodeLocation(node) }))
    .filter((entry): entry is { node: NodeLike; location: NodeLocation } => Boolean(entry.location))
    .sort((a, b) => distanceKm(devarajaLocation, a.location) - distanceKm(devarajaLocation, b.location))
    .map((entry) => entry.node);

  const alternatives: DevarajaAlternative[] = [];
  const paths: DevarajaAlternativePath[] = [];

  userConnections
    .filter((connection) => connection.to_node_id === DEVARAJA_MARKET_ID)
    .forEach((connection) => {
      const selected = candidateMarkets.slice(0, limit);
      selected.forEach((market) => {
        alternatives.push({
          ...market,
          originConnectionId: connection.id,
          originFromNodeId: connection.from_node_id,
        });
        paths.push({
          id: `${connection.id}-${market.id}-path`,
          fromNodeId: connection.from_node_id,
          toNodeId: market.id,
          originConnectionId: connection.id,
        });
      });
    });

  return { alternatives, paths };
};
