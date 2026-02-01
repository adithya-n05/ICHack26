import { PART_CATEGORIES, REGION_CENTERS } from './constants';

export type SupplierRecord = {
  id: string;
  companyId: string;
  name: string;
  tier: number;
  country: string;
  city: string;
  lat: number;
  lng: number;
  materials: string[];
  products: string[];
  priceCatalog: Record<string, { part: string; unit: string; min: number; max: number }[]>;
};

function jitter(value: number, delta: number) {
  return value + (Math.random() - 0.5) * delta;
}

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

export function generateSuppliers(count = 120) {
  const suppliers: SupplierRecord[] = [];

  for (let i = 0; i < count; i += 1) {
    const region = pickRandom(REGION_CENTERS);
    const category = pickRandom(PART_CATEGORIES);
    const part = pickRandom(category.parts);
    const minPrice = category.priceRange[0];
    const maxPrice = category.priceRange[1];
    const priceEntry = {
      part,
      unit: 'USD',
      min: Number((minPrice * (0.8 + Math.random() * 0.6)).toFixed(2)),
      max: Number((maxPrice * (0.8 + Math.random() * 0.6)).toFixed(2)),
    };

    const supplierId = `supplier-${i + 1}`;
    const name = `${region.code} Tech Supply ${i + 1}`;

    suppliers.push({
      id: supplierId,
      companyId: `company-${supplierId}`,
      name,
      tier: Math.random() > 0.7 ? 1 : Math.random() > 0.4 ? 2 : 3,
      country: region.country,
      city: region.city,
      lat: jitter(region.lat, 2.5),
      lng: jitter(region.lng, 2.5),
      materials: [category.category, part],
      products: [part],
      priceCatalog: {
        [category.category]: [priceEntry],
      },
    });
  }

  return suppliers;
}
