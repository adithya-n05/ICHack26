export interface Tariff {
  id: string;
  fromCountry: string;
  toCountry: string;
  productCategory: string;
  hsCodes: string[];
  rate: number;
  effectiveDate: string;
  description: string;
  sourceUrl?: string;
}
