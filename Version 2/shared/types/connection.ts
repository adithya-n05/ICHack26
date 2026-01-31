export type ConnectionStatus =
  | 'healthy'
  | 'monitoring'
  | 'at-risk'
  | 'critical'
  | 'disrupted';

export type TransportMode = 'sea' | 'air' | 'land';

export interface Connection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  transportMode: TransportMode;
  status: ConnectionStatus;
  isUserConnection: boolean;
  materials?: string[];
}
