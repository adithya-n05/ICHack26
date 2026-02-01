import { buildEntityKey } from './ingestOpenAI.utils';

type TypedEntity = {
  name: string;
  city?: string;
  country?: string;
  node_type?: string;
  type?: string;
};

type NamedEntity = {
  name: string;
};

export function buildTypedKey(entity: TypedEntity) {
  const type = (entity.node_type ?? entity.type ?? 'unknown').toLowerCase();
  return `${type}|${buildEntityKey({
    name: entity.name,
    city: entity.city ?? '',
    country: entity.country ?? '',
  })}`;
}

export function collectUniqueTyped<T extends TypedEntity>(
  items: T[],
  seen: Set<string>,
  limit: number,
) {
  if (limit <= 0) return [];
  const unique: T[] = [];
  for (const item of items) {
    const key = buildTypedKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
      if (unique.length >= limit) break;
    }
  }
  return unique;
}

export function filterNamedNodes<T extends NamedEntity>(items: T[]) {
  return items
    .map((item) => ({ ...item, name: item.name.trim() }))
    .filter((item) => {
      const normalized = item.name.toLowerCase();
      return (
        normalized.length > 0 &&
        !normalized.includes('unknown') &&
        !normalized.includes('unnamed') &&
        normalized !== 'port' &&
        normalized !== 'harbour'
      );
    });
}
