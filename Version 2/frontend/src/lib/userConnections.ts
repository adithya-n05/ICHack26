const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001';

export type UserConnectionInput = {
  from_node_id: string;
  to_node_id: string;
  transport_mode?: string;
  status?: string;
  materials?: string[];
  description?: string;
  lead_time_days?: number;
};

export async function fetchUserConnections() {
  const res = await fetch(`${API_URL}/api/user-connections`);
  if (!res.ok) {
    throw new Error(`Failed to load user connections (${res.status})`);
  }
  return res.json();
}

export async function createUserConnection(input: UserConnectionInput) {
  const payload = {
    ...input,
    transport_mode: input.transport_mode ?? 'land',
    status: input.status ?? 'healthy',
    is_user_connection: true,
  };

  const res = await fetch(`${API_URL}/api/user-connections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to create user connection (${res.status})`);
  }

  return res.json();
}

export async function deleteUserConnection(id: string) {
  const res = await fetch(`${API_URL}/api/user-connections/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error(`Failed to delete user connection (${res.status})`);
  }

  return res.json();
}
