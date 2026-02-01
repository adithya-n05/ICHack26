type WikidataCompany = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country?: string;
  city?: string;
  website?: string;
  industry?: string;
};

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';

function parseWktPoint(value: string | undefined) {
  if (!value) return null;
  const match = value.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/i);
  if (!match) return null;
  return { lng: Number(match[1]), lat: Number(match[2]) };
}

async function runSparql(query: string) {
  const url = `${WIKIDATA_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'SentinelZeroBot/1.0 (open-source data ingestion)',
      Accept: 'application/sparql-results+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Wikidata query failed: ${response.status}`);
  }

  return response.json() as Promise<{
    results: { bindings: Record<string, { value: string }>[] };
  }>;
}

function toCompany(bindings: Record<string, { value: string }>): WikidataCompany | null {
  const coord = parseWktPoint(bindings.coord?.value);
  if (!coord) return null;
  const id = bindings.company?.value.split('/').pop();
  if (!id) return null;

  return {
    id: `wd-${id}`,
    name: bindings.companyLabel?.value ?? 'Unknown',
    lat: coord.lat,
    lng: coord.lng,
    country: bindings.countryLabel?.value,
    city: bindings.cityLabel?.value,
    website: bindings.website?.value,
    industry: bindings.industryLabel?.value,
  };
}

const ELECTRONICS_INDUSTRY = [
  'wd:Q11660', // electronics industry
  'wd:Q11675', // semiconductor
  'wd:Q1046372', // computer hardware
  'wd:Q2221906', // electronic component
  'wd:Q180478', // integrated circuit
  'wd:Q132652', // semiconductor device
  'wd:Q2422933', // electronic component manufacturing
  'wd:Q192369', // telecommunications equipment
];

function buildIndustryQuery(limit: number, extraFilter: string, orderBy = '') {
  return `
SELECT ?company ?companyLabel ?coord ?countryLabel ?cityLabel ?website ?industryLabel WHERE {
  ?company wdt:P452 ?industry .
  VALUES ?industry { ${ELECTRONICS_INDUSTRY.join(' ')} }
  ?company wdt:P159 ?hq .
  ?hq wdt:P625 ?coord .
  OPTIONAL { ?company wdt:P856 ?website. }
  OPTIONAL { ?hq wdt:P17 ?country. }
  OPTIONAL { ?hq wdt:P131 ?city. }
  ${extraFilter}
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
${orderBy}
LIMIT ${limit}
`;
}

export async function fetchTopElectronicsCompanies(limit = 30) {
  const query = buildIndustryQuery(
    limit,
    'OPTIONAL { ?company wdt:P2139 ?revenue. }',
    'ORDER BY DESC(?revenue)',
  );
  const data = await runSparql(query);
  return data.results.bindings
    .map((bindings) => toCompany(bindings))
    .filter((company): company is WikidataCompany => Boolean(company));
}

export async function fetchElectronicsSuppliers(limit = 120) {
  const supplierFilter = `
  OPTIONAL { ?company wdt:P452 ?industry. }
  OPTIONAL { ?company wdt:P31 ?instanceOf. }
  `;
  const query = buildIndustryQuery(limit, supplierFilter);
  const data = await runSparql(query);
  return data.results.bindings
    .map((bindings) => toCompany(bindings))
    .filter((company): company is WikidataCompany => Boolean(company));
}

export async function fetchMajorCities(limit = 80) {
  const query = `
SELECT ?city ?cityLabel ?coord ?countryLabel ?population WHERE {
  ?city wdt:P31/wdt:P279* wd:Q515 .
  ?city wdt:P625 ?coord .
  ?city wdt:P17 ?country .
  ?city wdt:P1082 ?population .
  FILTER(?population > 2000000)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?population)
LIMIT ${limit}
`;
  const data = await runSparql(query);
  return data.results.bindings
    .map((bindings) => toCompany({ ...bindings, company: bindings.city, companyLabel: bindings.cityLabel }))
    .filter((city): city is WikidataCompany => Boolean(city));
}
