export function normalizeNodes(nodes: any[]) {
  const seen = new Map<string, any>();

  for (const node of nodes) {
    const key = `${node.name?.toLowerCase()}-${Math.round(node.lat * 100)}-${Math.round(
      node.lng * 100,
    )}`;

    if (!seen.has(key)) {
      seen.set(key, node);
    }
  }

  return Array.from(seen.values());
}
