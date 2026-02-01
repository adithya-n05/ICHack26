// backend/src/services/entityNormalization.ts
// Entity Normalization using UN/LOCODE and standard identifiers

// ============================================================================
// Types
// ============================================================================

export interface NormalizedPort {
  unlocode: string;       // UN/LOCODE (e.g., "CNSHA" for Shanghai)
  name: string;           // Official name
  alternateNames: string[];
  country: string;        // ISO 3166-1 alpha-2
  subdivision?: string;   // ISO 3166-2 subdivision
  coordinates: { lat: number; lng: number };
  function: string[];     // Port functions (1=port, 2=rail, 3=road, etc.)
  status: 'active' | 'inactive' | 'unknown';
}

export interface NormalizedCompany {
  lei?: string;           // Legal Entity Identifier
  duns?: string;          // D-U-N-S Number
  name: string;
  legalName?: string;
  country: string;
  industry?: string;
  aliases: string[];
}

export interface NormalizedCountry {
  iso2: string;           // ISO 3166-1 alpha-2
  iso3: string;           // ISO 3166-1 alpha-3
  numericCode: string;    // ISO 3166-1 numeric
  name: string;
  officialName?: string;
  region: string;
  subregion: string;
  intermediateRegion?: string;
}

export interface NormalizationResult<T> {
  normalized: T | null;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'alias' | 'none';
  alternatives?: T[];
}

// ============================================================================
// UN/LOCODE Database (subset of most important ports)
// Full database: https://unece.org/trade/cefact/unlocode-code-list-country-and-territory
// ============================================================================

const UNLOCODE_DATABASE: Record<string, Omit<NormalizedPort, 'unlocode'>> = {
  // China
  'CNSHA': { name: 'Shanghai', alternateNames: ['Port of Shanghai', 'Shanghai Port'], country: 'CN', coordinates: { lat: 31.2304, lng: 121.4737 }, function: ['1', '2', '3', '4'], status: 'active' },
  'CNSZX': { name: 'Shenzhen', alternateNames: ['Port of Shenzhen', 'Yantian'], country: 'CN', coordinates: { lat: 22.5431, lng: 114.0579 }, function: ['1', '4'], status: 'active' },
  'CNNGB': { name: 'Ningbo-Zhoushan', alternateNames: ['Ningbo', 'Ningbo Port', 'Zhoushan'], country: 'CN', coordinates: { lat: 29.8683, lng: 121.5440 }, function: ['1', '4'], status: 'active' },
  'CNTAO': { name: 'Qingdao', alternateNames: ['Port of Qingdao', 'Tsingtao'], country: 'CN', coordinates: { lat: 36.0671, lng: 120.3826 }, function: ['1', '4'], status: 'active' },
  'CNTXG': { name: 'Tianjin', alternateNames: ['Port of Tianjin', 'Tianjin Xingang'], country: 'CN', coordinates: { lat: 38.9860, lng: 117.7380 }, function: ['1', '4'], status: 'active' },
  'CNGZU': { name: 'Guangzhou', alternateNames: ['Canton', 'Port of Guangzhou'], country: 'CN', coordinates: { lat: 23.1291, lng: 113.2644 }, function: ['1', '2', '3', '4'], status: 'active' },
  'CNXMN': { name: 'Xiamen', alternateNames: ['Amoy', 'Port of Xiamen'], country: 'CN', coordinates: { lat: 24.4798, lng: 118.0894 }, function: ['1', '4'], status: 'active' },
  'CNDLC': { name: 'Dalian', alternateNames: ['Port of Dalian', 'Dairen'], country: 'CN', coordinates: { lat: 38.9140, lng: 121.6147 }, function: ['1', '4'], status: 'active' },
  
  // Singapore
  'SGSIN': { name: 'Singapore', alternateNames: ['Port of Singapore', 'PSA Singapore'], country: 'SG', coordinates: { lat: 1.2644, lng: 103.8222 }, function: ['1', '2', '3', '4'], status: 'active' },
  
  // South Korea
  'KRPUS': { name: 'Busan', alternateNames: ['Port of Busan', 'Pusan'], country: 'KR', coordinates: { lat: 35.1028, lng: 129.0326 }, function: ['1', '4'], status: 'active' },
  'KRINC': { name: 'Incheon', alternateNames: ['Port of Incheon'], country: 'KR', coordinates: { lat: 37.4563, lng: 126.7052 }, function: ['1', '2', '4'], status: 'active' },
  
  // Japan
  'JPTYO': { name: 'Tokyo', alternateNames: ['Port of Tokyo'], country: 'JP', coordinates: { lat: 35.6528, lng: 139.8395 }, function: ['1', '4'], status: 'active' },
  'JPYOK': { name: 'Yokohama', alternateNames: ['Port of Yokohama'], country: 'JP', coordinates: { lat: 35.4437, lng: 139.6380 }, function: ['1', '4'], status: 'active' },
  'JPOSA': { name: 'Osaka', alternateNames: ['Port of Osaka'], country: 'JP', coordinates: { lat: 34.6937, lng: 135.5023 }, function: ['1', '4'], status: 'active' },
  'JPNGO': { name: 'Nagoya', alternateNames: ['Port of Nagoya'], country: 'JP', coordinates: { lat: 35.0823, lng: 136.8827 }, function: ['1', '4'], status: 'active' },
  'JPKOB': { name: 'Kobe', alternateNames: ['Port of Kobe'], country: 'JP', coordinates: { lat: 34.6901, lng: 135.1956 }, function: ['1', '4'], status: 'active' },
  
  // Taiwan
  'TWKHH': { name: 'Kaohsiung', alternateNames: ['Port of Kaohsiung', 'Takao'], country: 'TW', coordinates: { lat: 22.6273, lng: 120.3014 }, function: ['1', '4'], status: 'active' },
  'TWTPE': { name: 'Taipei', alternateNames: ['Keelung', 'Port of Keelung'], country: 'TW', coordinates: { lat: 25.1276, lng: 121.7391 }, function: ['1', '2', '4'], status: 'active' },
  
  // Hong Kong
  'HKHKG': { name: 'Hong Kong', alternateNames: ['Port of Hong Kong', 'Victoria Harbour'], country: 'HK', coordinates: { lat: 22.2783, lng: 114.1747 }, function: ['1', '2', '4'], status: 'active' },
  
  // Malaysia
  'MYPKG': { name: 'Port Klang', alternateNames: ['Klang', 'Port Kelang'], country: 'MY', coordinates: { lat: 3.0000, lng: 101.4000 }, function: ['1', '4'], status: 'active' },
  'MYTPP': { name: 'Tanjung Pelepas', alternateNames: ['PTP'], country: 'MY', coordinates: { lat: 1.3667, lng: 103.5500 }, function: ['1', '4'], status: 'active' },
  
  // Vietnam
  'VNSGN': { name: 'Ho Chi Minh City', alternateNames: ['Saigon', 'Cat Lai'], country: 'VN', coordinates: { lat: 10.7769, lng: 106.7009 }, function: ['1', '4'], status: 'active' },
  'VNHPH': { name: 'Haiphong', alternateNames: ['Hai Phong', 'Port of Haiphong'], country: 'VN', coordinates: { lat: 20.8449, lng: 106.6881 }, function: ['1', '4'], status: 'active' },
  
  // Thailand
  'THLCH': { name: 'Laem Chabang', alternateNames: ['LCB'], country: 'TH', coordinates: { lat: 13.0827, lng: 100.8949 }, function: ['1', '4'], status: 'active' },
  'THBKK': { name: 'Bangkok', alternateNames: ['Klong Toey', 'Port of Bangkok'], country: 'TH', coordinates: { lat: 13.7563, lng: 100.5018 }, function: ['1', '2', '3', '4'], status: 'active' },
  
  // Indonesia
  'IDJKT': { name: 'Jakarta', alternateNames: ['Tanjung Priok', 'Port of Jakarta'], country: 'ID', coordinates: { lat: -6.1087, lng: 106.8806 }, function: ['1', '4'], status: 'active' },
  'IDSBY': { name: 'Surabaya', alternateNames: ['Tanjung Perak', 'Port of Surabaya'], country: 'ID', coordinates: { lat: -7.2575, lng: 112.7521 }, function: ['1', '4'], status: 'active' },
  
  // India
  'INNSA': { name: 'Nhava Sheva', alternateNames: ['JNPT', 'Jawaharlal Nehru Port', 'Mumbai'], country: 'IN', coordinates: { lat: 18.9500, lng: 72.9500 }, function: ['1', '4'], status: 'active' },
  'INMAA': { name: 'Chennai', alternateNames: ['Madras', 'Port of Chennai'], country: 'IN', coordinates: { lat: 13.0827, lng: 80.2707 }, function: ['1', '4'], status: 'active' },
  
  // UAE
  'AEJEA': { name: 'Jebel Ali', alternateNames: ['Dubai', 'Port of Jebel Ali', 'DP World'], country: 'AE', coordinates: { lat: 25.0157, lng: 55.0272 }, function: ['1', '4'], status: 'active' },
  
  // Saudi Arabia
  'SAJED': { name: 'Jeddah', alternateNames: ['Jiddah', 'Port of Jeddah'], country: 'SA', coordinates: { lat: 21.4858, lng: 39.1925 }, function: ['1', '4'], status: 'active' },
  
  // Egypt
  'EGPSD': { name: 'Port Said', alternateNames: ['Bur Said'], country: 'EG', coordinates: { lat: 31.2653, lng: 32.3019 }, function: ['1', '4'], status: 'active' },
  
  // Netherlands
  'NLRTM': { name: 'Rotterdam', alternateNames: ['Port of Rotterdam', 'Europoort'], country: 'NL', coordinates: { lat: 51.9225, lng: 4.4792 }, function: ['1', '2', '3', '4'], status: 'active' },
  'NLAMS': { name: 'Amsterdam', alternateNames: ['Port of Amsterdam'], country: 'NL', coordinates: { lat: 52.3676, lng: 4.9041 }, function: ['1', '2', '4'], status: 'active' },
  
  // Belgium
  'BEANR': { name: 'Antwerp', alternateNames: ['Antwerpen', 'Port of Antwerp'], country: 'BE', coordinates: { lat: 51.2194, lng: 4.4025 }, function: ['1', '2', '3', '4'], status: 'active' },
  
  // Germany
  'DEHAM': { name: 'Hamburg', alternateNames: ['Port of Hamburg'], country: 'DE', coordinates: { lat: 53.5511, lng: 9.9937 }, function: ['1', '2', '4'], status: 'active' },
  'DEBRV': { name: 'Bremerhaven', alternateNames: ['Bremen', 'Port of Bremerhaven'], country: 'DE', coordinates: { lat: 53.5396, lng: 8.5809 }, function: ['1', '4'], status: 'active' },
  
  // UK
  'GBFXT': { name: 'Felixstowe', alternateNames: ['Port of Felixstowe'], country: 'GB', coordinates: { lat: 51.9536, lng: 1.3511 }, function: ['1', '4'], status: 'active' },
  'GBSOU': { name: 'Southampton', alternateNames: ['Port of Southampton'], country: 'GB', coordinates: { lat: 50.9097, lng: -1.4044 }, function: ['1', '4'], status: 'active' },
  'GBLGP': { name: 'London Gateway', alternateNames: ['DP World London Gateway'], country: 'GB', coordinates: { lat: 51.4904, lng: 0.4508 }, function: ['1', '4'], status: 'active' },
  
  // Spain
  'ESVLC': { name: 'Valencia', alternateNames: ['Port of Valencia', 'Valenciaport'], country: 'ES', coordinates: { lat: 39.4699, lng: -0.3763 }, function: ['1', '4'], status: 'active' },
  'ESALG': { name: 'Algeciras', alternateNames: ['Port of Algeciras', 'Bahia de Algeciras'], country: 'ES', coordinates: { lat: 36.1408, lng: -5.4536 }, function: ['1', '4'], status: 'active' },
  'ESBCN': { name: 'Barcelona', alternateNames: ['Port of Barcelona'], country: 'ES', coordinates: { lat: 41.3851, lng: 2.1734 }, function: ['1', '2', '4'], status: 'active' },
  
  // Italy
  'ITGOA': { name: 'Genoa', alternateNames: ['Genova', 'Port of Genoa'], country: 'IT', coordinates: { lat: 44.4056, lng: 8.9463 }, function: ['1', '4'], status: 'active' },
  'ITGIT': { name: 'Gioia Tauro', alternateNames: ['Port of Gioia Tauro'], country: 'IT', coordinates: { lat: 38.4232, lng: 15.8982 }, function: ['1', '4'], status: 'active' },
  
  // Greece
  'GRPIR': { name: 'Piraeus', alternateNames: ['Port of Piraeus', 'Athens'], country: 'GR', coordinates: { lat: 37.9475, lng: 23.6417 }, function: ['1', '4'], status: 'active' },
  
  // Turkey
  'TRIST': { name: 'Istanbul', alternateNames: ['Ambarli', 'Port of Istanbul'], country: 'TR', coordinates: { lat: 41.0082, lng: 28.9784 }, function: ['1', '2', '4'], status: 'active' },
  
  // USA
  'USLAX': { name: 'Los Angeles', alternateNames: ['Port of LA', 'San Pedro'], country: 'US', subdivision: 'CA', coordinates: { lat: 33.7295, lng: -118.2625 }, function: ['1', '4'], status: 'active' },
  'USLGB': { name: 'Long Beach', alternateNames: ['Port of Long Beach'], country: 'US', subdivision: 'CA', coordinates: { lat: 33.7500, lng: -118.2167 }, function: ['1', '4'], status: 'active' },
  'USNYC': { name: 'New York/New Jersey', alternateNames: ['Port Newark', 'Port of NY/NJ'], country: 'US', subdivision: 'NY', coordinates: { lat: 40.6699, lng: -74.1460 }, function: ['1', '4'], status: 'active' },
  'USSAV': { name: 'Savannah', alternateNames: ['Port of Savannah', 'Garden City'], country: 'US', subdivision: 'GA', coordinates: { lat: 32.0809, lng: -81.0912 }, function: ['1', '4'], status: 'active' },
  'USHOU': { name: 'Houston', alternateNames: ['Port of Houston', 'Bayport'], country: 'US', subdivision: 'TX', coordinates: { lat: 29.7604, lng: -95.3698 }, function: ['1', '4'], status: 'active' },
  'USSEA': { name: 'Seattle/Tacoma', alternateNames: ['NWSA', 'Port of Seattle'], country: 'US', subdivision: 'WA', coordinates: { lat: 47.5801, lng: -122.3431 }, function: ['1', '4'], status: 'active' },
  'USOAL': { name: 'Oakland', alternateNames: ['Port of Oakland'], country: 'US', subdivision: 'CA', coordinates: { lat: 37.7955, lng: -122.2773 }, function: ['1', '4'], status: 'active' },
  
  // Canada
  'CAVAN': { name: 'Vancouver', alternateNames: ['Port of Vancouver', 'Deltaport'], country: 'CA', subdivision: 'BC', coordinates: { lat: 49.2827, lng: -123.1207 }, function: ['1', '2', '4'], status: 'active' },
  'CAMTR': { name: 'Montreal', alternateNames: ['Port of Montreal'], country: 'CA', subdivision: 'QC', coordinates: { lat: 45.5017, lng: -73.5673 }, function: ['1', '2', '4'], status: 'active' },
  
  // Mexico
  'MXMAN': { name: 'Manzanillo', alternateNames: ['Port of Manzanillo'], country: 'MX', coordinates: { lat: 19.0512, lng: -104.3188 }, function: ['1', '4'], status: 'active' },
  'MXLZC': { name: 'Lazaro Cardenas', alternateNames: ['Port of Lazaro Cardenas'], country: 'MX', coordinates: { lat: 17.9584, lng: -102.1848 }, function: ['1', '4'], status: 'active' },
  
  // Brazil
  'BRSSZ': { name: 'Santos', alternateNames: ['Port of Santos'], country: 'BR', coordinates: { lat: -23.9618, lng: -46.3322 }, function: ['1', '4'], status: 'active' },
  'BRPNG': { name: 'Paranagua', alternateNames: ['Port of Paranagua'], country: 'BR', coordinates: { lat: -25.5162, lng: -48.5222 }, function: ['1', '4'], status: 'active' },
  
  // Panama
  'PABLB': { name: 'Balboa', alternateNames: ['Port of Balboa', 'Panama Pacific'], country: 'PA', coordinates: { lat: 8.9500, lng: -79.5667 }, function: ['1', '4'], status: 'active' },
  'PAONX': { name: 'Colon', alternateNames: ['Manzanillo International Terminal', 'MIT'], country: 'PA', coordinates: { lat: 9.3547, lng: -79.9017 }, function: ['1', '4'], status: 'active' },
  
  // Australia
  'AUMEL': { name: 'Melbourne', alternateNames: ['Port of Melbourne'], country: 'AU', subdivision: 'VIC', coordinates: { lat: -37.8136, lng: 144.9631 }, function: ['1', '4'], status: 'active' },
  'AUSYD': { name: 'Sydney', alternateNames: ['Port Botany', 'Port of Sydney'], country: 'AU', subdivision: 'NSW', coordinates: { lat: -33.9425, lng: 151.1817 }, function: ['1', '4'], status: 'active' },
  'AUBNE': { name: 'Brisbane', alternateNames: ['Port of Brisbane'], country: 'AU', subdivision: 'QLD', coordinates: { lat: -27.3800, lng: 153.1178 }, function: ['1', '4'], status: 'active' },
  
  // South Africa
  'ZADUR': { name: 'Durban', alternateNames: ['Port of Durban'], country: 'ZA', coordinates: { lat: -29.8587, lng: 31.0218 }, function: ['1', '4'], status: 'active' },
};

// ============================================================================
// ISO 3166-1 Country Database (subset)
// ============================================================================

const COUNTRY_DATABASE: Record<string, Omit<NormalizedCountry, 'iso2'>> = {
  'US': { iso3: 'USA', numericCode: '840', name: 'United States', officialName: 'United States of America', region: 'Americas', subregion: 'Northern America' },
  'CN': { iso3: 'CHN', numericCode: '156', name: 'China', officialName: "People's Republic of China", region: 'Asia', subregion: 'Eastern Asia' },
  'JP': { iso3: 'JPN', numericCode: '392', name: 'Japan', region: 'Asia', subregion: 'Eastern Asia' },
  'DE': { iso3: 'DEU', numericCode: '276', name: 'Germany', officialName: 'Federal Republic of Germany', region: 'Europe', subregion: 'Western Europe' },
  'GB': { iso3: 'GBR', numericCode: '826', name: 'United Kingdom', officialName: 'United Kingdom of Great Britain and Northern Ireland', region: 'Europe', subregion: 'Northern Europe' },
  'FR': { iso3: 'FRA', numericCode: '250', name: 'France', officialName: 'French Republic', region: 'Europe', subregion: 'Western Europe' },
  'KR': { iso3: 'KOR', numericCode: '410', name: 'South Korea', officialName: 'Republic of Korea', region: 'Asia', subregion: 'Eastern Asia' },
  'IN': { iso3: 'IND', numericCode: '356', name: 'India', officialName: 'Republic of India', region: 'Asia', subregion: 'Southern Asia' },
  'IT': { iso3: 'ITA', numericCode: '380', name: 'Italy', officialName: 'Italian Republic', region: 'Europe', subregion: 'Southern Europe' },
  'CA': { iso3: 'CAN', numericCode: '124', name: 'Canada', region: 'Americas', subregion: 'Northern America' },
  'AU': { iso3: 'AUS', numericCode: '036', name: 'Australia', officialName: 'Commonwealth of Australia', region: 'Oceania', subregion: 'Australia and New Zealand' },
  'BR': { iso3: 'BRA', numericCode: '076', name: 'Brazil', officialName: 'Federative Republic of Brazil', region: 'Americas', subregion: 'South America' },
  'MX': { iso3: 'MEX', numericCode: '484', name: 'Mexico', officialName: 'United Mexican States', region: 'Americas', subregion: 'Central America' },
  'SG': { iso3: 'SGP', numericCode: '702', name: 'Singapore', officialName: 'Republic of Singapore', region: 'Asia', subregion: 'South-eastern Asia' },
  'TW': { iso3: 'TWN', numericCode: '158', name: 'Taiwan', region: 'Asia', subregion: 'Eastern Asia' },
  'HK': { iso3: 'HKG', numericCode: '344', name: 'Hong Kong', officialName: 'Hong Kong Special Administrative Region of China', region: 'Asia', subregion: 'Eastern Asia' },
  'NL': { iso3: 'NLD', numericCode: '528', name: 'Netherlands', officialName: 'Kingdom of the Netherlands', region: 'Europe', subregion: 'Western Europe' },
  'BE': { iso3: 'BEL', numericCode: '056', name: 'Belgium', officialName: 'Kingdom of Belgium', region: 'Europe', subregion: 'Western Europe' },
  'ES': { iso3: 'ESP', numericCode: '724', name: 'Spain', officialName: 'Kingdom of Spain', region: 'Europe', subregion: 'Southern Europe' },
  'AE': { iso3: 'ARE', numericCode: '784', name: 'United Arab Emirates', region: 'Asia', subregion: 'Western Asia' },
  'MY': { iso3: 'MYS', numericCode: '458', name: 'Malaysia', region: 'Asia', subregion: 'South-eastern Asia' },
  'TH': { iso3: 'THA', numericCode: '764', name: 'Thailand', officialName: 'Kingdom of Thailand', region: 'Asia', subregion: 'South-eastern Asia' },
  'VN': { iso3: 'VNM', numericCode: '704', name: 'Vietnam', officialName: 'Socialist Republic of Viet Nam', region: 'Asia', subregion: 'South-eastern Asia' },
  'ID': { iso3: 'IDN', numericCode: '360', name: 'Indonesia', officialName: 'Republic of Indonesia', region: 'Asia', subregion: 'South-eastern Asia' },
  'PH': { iso3: 'PHL', numericCode: '608', name: 'Philippines', officialName: 'Republic of the Philippines', region: 'Asia', subregion: 'South-eastern Asia' },
  'RU': { iso3: 'RUS', numericCode: '643', name: 'Russia', officialName: 'Russian Federation', region: 'Europe', subregion: 'Eastern Europe' },
  'UA': { iso3: 'UKR', numericCode: '804', name: 'Ukraine', region: 'Europe', subregion: 'Eastern Europe' },
  'TR': { iso3: 'TUR', numericCode: '792', name: 'Turkey', officialName: 'Republic of Türkiye', region: 'Asia', subregion: 'Western Asia' },
  'SA': { iso3: 'SAU', numericCode: '682', name: 'Saudi Arabia', officialName: 'Kingdom of Saudi Arabia', region: 'Asia', subregion: 'Western Asia' },
  'ZA': { iso3: 'ZAF', numericCode: '710', name: 'South Africa', officialName: 'Republic of South Africa', region: 'Africa', subregion: 'Southern Africa' },
  'EG': { iso3: 'EGY', numericCode: '818', name: 'Egypt', officialName: 'Arab Republic of Egypt', region: 'Africa', subregion: 'Northern Africa' },
  'GR': { iso3: 'GRC', numericCode: '300', name: 'Greece', officialName: 'Hellenic Republic', region: 'Europe', subregion: 'Southern Europe' },
  'PA': { iso3: 'PAN', numericCode: '591', name: 'Panama', officialName: 'Republic of Panama', region: 'Americas', subregion: 'Central America' },
};

// ============================================================================
// Normalization Functions
// ============================================================================

/**
 * Normalize a port name to UN/LOCODE
 */
export function normalizePort(input: string): NormalizationResult<NormalizedPort> {
  const inputLower = input.toLowerCase().trim();
  const inputUpper = input.toUpperCase().trim();
  
  // Check for exact UNLOCODE match
  if (UNLOCODE_DATABASE[inputUpper]) {
    return {
      normalized: { unlocode: inputUpper, ...UNLOCODE_DATABASE[inputUpper] },
      confidence: 1.0,
      matchType: 'exact',
    };
  }
  
  // Check for name or alias match
  for (const [unlocode, port] of Object.entries(UNLOCODE_DATABASE)) {
    if (port.name.toLowerCase() === inputLower) {
      return {
        normalized: { unlocode, ...port },
        confidence: 0.95,
        matchType: 'exact',
      };
    }
    
    for (const alias of port.alternateNames) {
      if (alias.toLowerCase() === inputLower) {
        return {
          normalized: { unlocode, ...port },
          confidence: 0.9,
          matchType: 'alias',
        };
      }
    }
  }
  
  // Fuzzy matching
  const matches = fuzzyMatchPorts(inputLower);
  if (matches.length > 0) {
    const best = matches[0];
    return {
      normalized: { unlocode: best.unlocode, ...UNLOCODE_DATABASE[best.unlocode] },
      confidence: best.score,
      matchType: 'fuzzy',
      alternatives: matches.slice(1, 4).map(m => ({ 
        unlocode: m.unlocode, 
        ...UNLOCODE_DATABASE[m.unlocode] 
      })),
    };
  }
  
  return { normalized: null, confidence: 0, matchType: 'none' };
}

/**
 * Fuzzy match ports using Levenshtein distance
 */
function fuzzyMatchPorts(input: string): Array<{ unlocode: string; score: number }> {
  const results: Array<{ unlocode: string; score: number }> = [];
  
  for (const [unlocode, port] of Object.entries(UNLOCODE_DATABASE)) {
    const nameDist = levenshteinDistance(input, port.name.toLowerCase());
    const nameScore = 1 - nameDist / Math.max(input.length, port.name.length);
    
    let bestScore = nameScore;
    
    for (const alias of port.alternateNames) {
      const aliasDist = levenshteinDistance(input, alias.toLowerCase());
      const aliasScore = 1 - aliasDist / Math.max(input.length, alias.length);
      bestScore = Math.max(bestScore, aliasScore);
    }
    
    if (bestScore > 0.6) {
      results.push({ unlocode, score: bestScore });
    }
  }
  
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Normalize a country name to ISO 3166
 */
export function normalizeCountry(input: string): NormalizationResult<NormalizedCountry> {
  const inputLower = input.toLowerCase().trim();
  const inputUpper = input.toUpperCase().trim();
  
  // Check for ISO code match
  if (COUNTRY_DATABASE[inputUpper]) {
    return {
      normalized: { iso2: inputUpper, ...COUNTRY_DATABASE[inputUpper] },
      confidence: 1.0,
      matchType: 'exact',
    };
  }
  
  // Check for ISO3 or name match
  for (const [iso2, country] of Object.entries(COUNTRY_DATABASE)) {
    if (country.iso3 === inputUpper) {
      return {
        normalized: { iso2, ...country },
        confidence: 1.0,
        matchType: 'exact',
      };
    }
    
    if (country.name.toLowerCase() === inputLower || 
        country.officialName?.toLowerCase() === inputLower) {
      return {
        normalized: { iso2, ...country },
        confidence: 0.95,
        matchType: 'exact',
      };
    }
  }
  
  // Common aliases
  const aliases: Record<string, string> = {
    'usa': 'US', 'america': 'US', 'united states of america': 'US',
    'uk': 'GB', 'britain': 'GB', 'great britain': 'GB', 'england': 'GB',
    'korea': 'KR', 'south korea': 'KR', 'republic of korea': 'KR',
    'uae': 'AE', 'emirates': 'AE',
    'holland': 'NL',
    'russia': 'RU', 'russian federation': 'RU',
  };
  
  if (aliases[inputLower]) {
    const iso2 = aliases[inputLower];
    return {
      normalized: { iso2, ...COUNTRY_DATABASE[iso2] },
      confidence: 0.9,
      matchType: 'alias',
    };
  }
  
  return { normalized: null, confidence: 0, matchType: 'none' };
}

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  return matrix[a.length][b.length];
}

/**
 * Get all ports for a country
 */
export function getPortsByCountry(countryCode: string): NormalizedPort[] {
  const code = countryCode.toUpperCase();
  const ports: NormalizedPort[] = [];
  
  for (const [unlocode, port] of Object.entries(UNLOCODE_DATABASE)) {
    if (port.country === code) {
      ports.push({ unlocode, ...port });
    }
  }
  
  return ports;
}

/**
 * Get port by UNLOCODE
 */
export function getPortByUnlocode(unlocode: string): NormalizedPort | null {
  const code = unlocode.toUpperCase();
  if (UNLOCODE_DATABASE[code]) {
    return { unlocode: code, ...UNLOCODE_DATABASE[code] };
  }
  return null;
}

/**
 * Get country by ISO code
 */
export function getCountryByCode(code: string): NormalizedCountry | null {
  const iso2 = code.toUpperCase();
  if (COUNTRY_DATABASE[iso2]) {
    return { iso2, ...COUNTRY_DATABASE[iso2] };
  }
  return null;
}

/**
 * Validate UNLOCODE format
 */
export function isValidUnlocode(code: string): boolean {
  // UNLOCODE format: 2 letter country + 3 letter location
  return /^[A-Z]{2}[A-Z0-9]{3}$/.test(code.toUpperCase());
}

/**
 * Extract country from UNLOCODE
 */
export function getCountryFromUnlocode(unlocode: string): string | null {
  if (!isValidUnlocode(unlocode)) return null;
  return unlocode.substring(0, 2).toUpperCase();
}

/**
 * Normalize a batch of port names
 */
export function normalizePortBatch(inputs: string[]): Array<NormalizationResult<NormalizedPort>> {
  return inputs.map(input => normalizePort(input));
}

/**
 * Search ports by partial name
 */
export function searchPorts(query: string, limit: number = 10): NormalizedPort[] {
  const queryLower = query.toLowerCase();
  const results: Array<{ port: NormalizedPort; score: number }> = [];
  
  for (const [unlocode, port] of Object.entries(UNLOCODE_DATABASE)) {
    const nameLower = port.name.toLowerCase();
    
    if (nameLower.includes(queryLower)) {
      const score = nameLower.startsWith(queryLower) ? 1 : 0.8;
      results.push({ port: { unlocode, ...port }, score });
      continue;
    }
    
    for (const alias of port.alternateNames) {
      if (alias.toLowerCase().includes(queryLower)) {
        results.push({ port: { unlocode, ...port }, score: 0.7 });
        break;
      }
    }
  }
  
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.port);
}
