type EntityLike = {
  name: string;
  city: string;
  country: string;
};

type SupplierInput = EntityLike & {
  parts: string[];
};

const INVALID_LOCATION_TOKENS = new Set([
  '',
  ',',
  'unknown',
  'n/a',
  'na',
  'none',
  'null',
  'tbd',
  'tba',
]);

function normalizeValue(value: string) {
  return value.trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

export function buildEntityKey(entity: EntityLike) {
  return `${normalizeValue(entity.name).toLowerCase()}|${normalizeValue(entity.city).toLowerCase()}|${normalizeValue(
    entity.country,
  ).toLowerCase()}`;
}

export function buildDeterministicId(prefix: string, name: string) {
  return `${prefix}-${slugify(name)}-${hashString(name)}`;
}

export function formatAvoidList(names: string[], limit = 50) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= limit) {
      break;
    }
  }
  return result.join(', ');
}

export function sanitizeEntities<T extends EntityLike>(items: T[]) {
  return items
    .map((item) => ({
      ...item,
      name: normalizeValue(item.name),
      city: normalizeValue(item.city),
      country: normalizeValue(item.country),
    }))
    .filter((item) => {
      const city = item.city.toLowerCase();
      const country = item.country.toLowerCase();
      return (
        item.name.length > 0 &&
        item.city.length > 0 &&
        item.country.length > 0 &&
        !INVALID_LOCATION_TOKENS.has(city) &&
        !INVALID_LOCATION_TOKENS.has(country)
      );
    });
}

export function sanitizeSuppliers(items: SupplierInput[]) {
  const sanitized = sanitizeEntities(
    items.map((item) => ({ name: item.name, city: item.city, country: item.country })),
  );
  const keep = new Set(sanitized.map((item) => buildEntityKey(item)));
  return items
    .map((item) => ({
      ...item,
      name: item.name.trim(),
      city: item.city.trim(),
      country: item.country.trim(),
    }))
    .filter((item) => keep.has(buildEntityKey(item)));
}

export function collectUnique<T extends EntityLike>(items: T[], seen: Set<string>) {
  const unique: T[] = [];
  for (const item of items) {
    const key = buildEntityKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }
  return unique;
}

export function collectUniqueLimited<T extends EntityLike>(items: T[], seen: Set<string>, limit: number) {
  if (limit <= 0) {
    return [];
  }
  const unique: T[] = [];
  for (const item of items) {
    const key = buildEntityKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
      if (unique.length >= limit) {
        break;
      }
    }
  }
  return unique;
}
