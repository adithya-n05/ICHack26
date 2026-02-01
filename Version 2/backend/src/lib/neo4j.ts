// backend/src/lib/neo4j.ts
import neo4j, { Driver, Session } from 'neo4j-driver';

let driver: Driver | null = null;

export function initNeo4j(): Driver {
  const uri = process.env.NEO4J_URI || 'neo4j+s://localhost:7687';
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || '';

  if (!password) {
    console.warn('NEO4J_PASSWORD not set - graph features disabled');
    return null as any;
  }

  driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
  });

  console.log('Neo4j driver initialized');
  return driver;
}

export function getDriver(): Driver | null {
  return driver;
}

export async function getSession(): Promise<Session | null> {
  if (!driver) return null;
  return driver.session();
}

export async function closeNeo4j(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

// Helper to run a query with automatic session management
export async function runQuery<T = any>(
  cypher: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const session = await getSession();
  if (!session) return [];

  try {
    const result = await session.run(cypher, params);
    return result.records.map((record) => record.toObject() as T);
  } finally {
    await session.close();
  }
}

// Helper for write transactions
export async function runWrite<T = any>(
  cypher: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const session = await getSession();
  if (!session) return [];

  try {
    const result = await session.executeWrite((tx) => tx.run(cypher, params));
    return result.records.map((record) => record.toObject() as T);
  } finally {
    await session.close();
  }
}
