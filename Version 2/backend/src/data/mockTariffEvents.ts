export type MockTariffEvent = {
  id: string;
  type: 'tariff';
  title: string;
  description: string;
  severity: number;
  lat: number;
  lng: number;
  country: string;
  region: string;
  start_date: string;
  end_date: string | null;
  source: string;
  source_url?: string;
};

const TARIFF_START = '2026-01-10T00:00:00Z';

export const buildMockTariffEvents = (): MockTariffEvent[] => [
  {
    id: 'tariff-us-china-tech-2026',
    type: 'tariff',
    title: 'Tariff escalation: US-China tech goods',
    description:
      'Levied by the Office of the U.S. Trade Representative. Target: China. Scope includes advanced semiconductors, networking hardware, and related ICT components.',
    severity: 8,
    lat: 31.2304,
    lng: 121.4737,
    country: 'China',
    region: 'East Asia',
    start_date: TARIFF_START,
    end_date: null,
    source: 'Office of the U.S. Trade Representative',
  },
  {
    id: 'tariff-eu-china-ev-2026',
    type: 'tariff',
    title: 'EU tariffs on imported EVs',
    description:
      'Levied by the European Commission. Target: China. Provisional anti-subsidy duties on battery electric vehicles and key drivetrain components.',
    severity: 7,
    lat: 50.8476,
    lng: 4.3572,
    country: 'Belgium',
    region: 'Western Europe',
    start_date: '2026-01-15T00:00:00Z',
    end_date: null,
    source: 'European Commission',
  },
  {
    id: 'tariff-india-china-electronics-2026',
    type: 'tariff',
    title: 'Tariff adjustments on electronics imports',
    description:
      'Levied by the India Ministry of Finance. Target: China. Higher duties on smartphones, printed circuit boards, and display modules.',
    severity: 6,
    lat: 28.6139,
    lng: 77.209,
    country: 'India',
    region: 'South Asia',
    start_date: '2026-01-05T00:00:00Z',
    end_date: null,
    source: 'India Ministry of Finance',
  },
  {
    id: 'tariff-us-eu-steel-2026',
    type: 'tariff',
    title: 'Steel tariff review: US-EU',
    description:
      'Levied by the U.S. Department of Commerce. Target: European Union. Section 232 tariff review covering steel and aluminum imports.',
    severity: 6,
    lat: 38.9072,
    lng: -77.0369,
    country: 'European Union',
    region: 'North America',
    start_date: '2025-12-20T00:00:00Z',
    end_date: null,
    source: 'U.S. Department of Commerce',
  },
  {
    id: 'tariff-mexico-us-auto-2026',
    type: 'tariff',
    title: 'Auto parts tariff pressure: Mexico-US',
    description:
      'Levied by the U.S. International Trade Commission. Target: Mexico. Review of tariffs on auto parts and subassemblies tied to origin rules.',
    severity: 6,
    lat: 19.4326,
    lng: -99.1332,
    country: 'Mexico',
    region: 'North America',
    start_date: '2025-12-10T00:00:00Z',
    end_date: null,
    source: 'U.S. International Trade Commission',
  },
  {
    id: 'tariff-canada-us-lumber-2026',
    type: 'tariff',
    title: 'Softwood lumber tariffs',
    description:
      'Levied by the U.S. Department of Commerce. Target: Canada. Countervailing and anti-dumping duties on softwood lumber exports.',
    severity: 5,
    lat: 45.4215,
    lng: -75.6972,
    country: 'Canada',
    region: 'North America',
    start_date: '2025-11-28T00:00:00Z',
    end_date: null,
    source: 'U.S. Department of Commerce',
  },
  {
    id: 'tariff-uk-eu-food-2026',
    type: 'tariff',
    title: 'Food import tariffs: UK-EU',
    description:
      'Levied by the UK Department for Business and Trade. Target: European Union. Tariff adjustments on processed food and agricultural inputs.',
    severity: 5,
    lat: 51.5074,
    lng: -0.1278,
    country: 'European Union',
    region: 'Western Europe',
    start_date: '2025-12-02T00:00:00Z',
    end_date: null,
    source: 'UK Department for Business and Trade',
  },
  {
    id: 'tariff-turkey-us-metals-2026',
    type: 'tariff',
    title: 'Metals tariff response',
    description:
      'Levied by the Republic of Türkiye Ministry of Trade. Target: Russia. Safeguard duties on steel billets and rolled products.',
    severity: 6,
    lat: 39.9334,
    lng: 32.8597,
    country: 'Russia',
    region: 'Eurasia',
    start_date: '2025-11-15T00:00:00Z',
    end_date: null,
    source: 'Republic of Türkiye Ministry of Trade',
  },
  {
    id: 'tariff-brazil-us-steel-2026',
    type: 'tariff',
    title: 'Steel tariff adjustments: Brazil',
    description:
      'Levied by the Brazil Ministry of Development, Industry, Trade and Services. Target: China. Tariff review on steel and aluminum imports.',
    severity: 6,
    lat: -15.7939,
    lng: -47.8828,
    country: 'China',
    region: 'South America',
    start_date: '2025-12-18T00:00:00Z',
    end_date: null,
    source: 'Brazil Ministry of Development, Industry, Trade and Services',
  },
  {
    id: 'tariff-australia-china-wine-2026',
    type: 'tariff',
    title: 'Tariff pressure on beverage exports',
    description:
      'Levied by the Australia Anti-Dumping Commission. Target: China. Duties on beverage containers and related packaging materials.',
    severity: 5,
    lat: -35.2809,
    lng: 149.13,
    country: 'China',
    region: 'Oceania',
    start_date: '2025-11-20T00:00:00Z',
    end_date: null,
    source: 'Australia Anti-Dumping Commission',
  },
];
