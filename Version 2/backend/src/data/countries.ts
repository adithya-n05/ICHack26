// backend/src/data/countries.ts
// Complete mapping of ISO 2-letter country codes to country names and coordinates

export interface CountryData {
  name: string;
  lat: number;
  lng: number;
}

export const COUNTRIES: Record<string, CountryData> = {
  // Asia
  CN: { name: 'China', lat: 35.8617, lng: 104.1954 },
  TW: { name: 'Taiwan', lat: 23.6978, lng: 120.9605 },
  JP: { name: 'Japan', lat: 36.2048, lng: 138.2529 },
  KR: { name: 'South Korea', lat: 35.9078, lng: 127.7669 },
  KP: { name: 'North Korea', lat: 40.3399, lng: 127.5101 },
  IN: { name: 'India', lat: 20.5937, lng: 78.9629 },
  PK: { name: 'Pakistan', lat: 30.3753, lng: 69.3451 },
  BD: { name: 'Bangladesh', lat: 23.6850, lng: 90.3563 },
  VN: { name: 'Vietnam', lat: 14.0583, lng: 108.2772 },
  TH: { name: 'Thailand', lat: 15.8700, lng: 100.9925 },
  MY: { name: 'Malaysia', lat: 4.2105, lng: 101.9758 },
  SG: { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
  ID: { name: 'Indonesia', lat: -0.7893, lng: 113.9213 },
  PH: { name: 'Philippines', lat: 12.8797, lng: 121.7740 },
  MM: { name: 'Myanmar', lat: 21.9162, lng: 95.9560 },
  KH: { name: 'Cambodia', lat: 12.5657, lng: 104.9910 },
  LA: { name: 'Laos', lat: 19.8563, lng: 102.4955 },
  NP: { name: 'Nepal', lat: 28.3949, lng: 84.1240 },
  LK: { name: 'Sri Lanka', lat: 7.8731, lng: 80.7718 },
  AF: { name: 'Afghanistan', lat: 33.9391, lng: 67.7100 },
  MN: { name: 'Mongolia', lat: 46.8625, lng: 103.8467 },
  KZ: { name: 'Kazakhstan', lat: 48.0196, lng: 66.9237 },
  UZ: { name: 'Uzbekistan', lat: 41.3775, lng: 64.5853 },
  TM: { name: 'Turkmenistan', lat: 38.9697, lng: 59.5563 },
  KG: { name: 'Kyrgyzstan', lat: 41.2044, lng: 74.7661 },
  TJ: { name: 'Tajikistan', lat: 38.8610, lng: 71.2761 },
  BT: { name: 'Bhutan', lat: 27.5142, lng: 90.4336 },
  MV: { name: 'Maldives', lat: 3.2028, lng: 73.2207 },
  BN: { name: 'Brunei', lat: 4.5353, lng: 114.7277 },
  TL: { name: 'Timor-Leste', lat: -8.8742, lng: 125.7275 },

  // Middle East
  IR: { name: 'Iran', lat: 32.4279, lng: 53.6880 },
  IQ: { name: 'Iraq', lat: 33.2232, lng: 43.6793 },
  SA: { name: 'Saudi Arabia', lat: 23.8859, lng: 45.0792 },
  AE: { name: 'United Arab Emirates', lat: 23.4241, lng: 53.8478 },
  IL: { name: 'Israel', lat: 31.0461, lng: 34.8516 },
  PS: { name: 'Palestine', lat: 31.9522, lng: 35.2332 },
  JO: { name: 'Jordan', lat: 30.5852, lng: 36.2384 },
  LB: { name: 'Lebanon', lat: 33.8547, lng: 35.8623 },
  SY: { name: 'Syria', lat: 34.8021, lng: 38.9968 },
  YE: { name: 'Yemen', lat: 15.5527, lng: 48.5164 },
  OM: { name: 'Oman', lat: 21.4735, lng: 55.9754 },
  KW: { name: 'Kuwait', lat: 29.3117, lng: 47.4818 },
  QA: { name: 'Qatar', lat: 25.3548, lng: 51.1839 },
  BH: { name: 'Bahrain', lat: 26.0667, lng: 50.5577 },
  TR: { name: 'Turkey', lat: 38.9637, lng: 35.2433 },
  CY: { name: 'Cyprus', lat: 35.1264, lng: 33.4299 },
  GE: { name: 'Georgia', lat: 42.3154, lng: 43.3569 },
  AM: { name: 'Armenia', lat: 40.0691, lng: 45.0382 },
  AZ: { name: 'Azerbaijan', lat: 40.1431, lng: 47.5769 },

  // Europe
  GB: { name: 'United Kingdom', lat: 55.3781, lng: -3.4360 },
  UK: { name: 'United Kingdom', lat: 55.3781, lng: -3.4360 },
  DE: { name: 'Germany', lat: 51.1657, lng: 10.4515 },
  FR: { name: 'France', lat: 46.2276, lng: 2.2137 },
  IT: { name: 'Italy', lat: 41.8719, lng: 12.5674 },
  ES: { name: 'Spain', lat: 40.4637, lng: -3.7492 },
  PT: { name: 'Portugal', lat: 39.3999, lng: -8.2245 },
  NL: { name: 'Netherlands', lat: 52.1326, lng: 5.2913 },
  BE: { name: 'Belgium', lat: 50.5039, lng: 4.4699 },
  AT: { name: 'Austria', lat: 47.5162, lng: 14.5501 },
  CH: { name: 'Switzerland', lat: 46.8182, lng: 8.2275 },
  PL: { name: 'Poland', lat: 51.9194, lng: 19.1451 },
  CZ: { name: 'Czech Republic', lat: 49.8175, lng: 15.4730 },
  SK: { name: 'Slovakia', lat: 48.6690, lng: 19.6990 },
  HU: { name: 'Hungary', lat: 47.1625, lng: 19.5033 },
  RO: { name: 'Romania', lat: 45.9432, lng: 24.9668 },
  BG: { name: 'Bulgaria', lat: 42.7339, lng: 25.4858 },
  GR: { name: 'Greece', lat: 39.0742, lng: 21.8243 },
  SE: { name: 'Sweden', lat: 60.1282, lng: 18.6435 },
  NO: { name: 'Norway', lat: 60.4720, lng: 8.4689 },
  FI: { name: 'Finland', lat: 61.9241, lng: 25.7482 },
  DK: { name: 'Denmark', lat: 56.2639, lng: 9.5018 },
  IE: { name: 'Ireland', lat: 53.4129, lng: -8.2439 },
  RU: { name: 'Russia', lat: 61.5240, lng: 105.3188 },
  UA: { name: 'Ukraine', lat: 48.3794, lng: 31.1656 },
  BY: { name: 'Belarus', lat: 53.7098, lng: 27.9534 },
  LT: { name: 'Lithuania', lat: 55.1694, lng: 23.8813 },
  LV: { name: 'Latvia', lat: 56.8796, lng: 24.6032 },
  EE: { name: 'Estonia', lat: 58.5953, lng: 25.0136 },
  HR: { name: 'Croatia', lat: 45.1000, lng: 15.2000 },
  SI: { name: 'Slovenia', lat: 46.1512, lng: 14.9955 },
  RS: { name: 'Serbia', lat: 44.0165, lng: 21.0059 },
  BA: { name: 'Bosnia and Herzegovina', lat: 43.9159, lng: 17.6791 },
  ME: { name: 'Montenegro', lat: 42.7087, lng: 19.3744 },
  MK: { name: 'North Macedonia', lat: 41.5124, lng: 21.7465 },
  AL: { name: 'Albania', lat: 41.1533, lng: 20.1683 },
  XK: { name: 'Kosovo', lat: 42.6026, lng: 20.9030 },
  MD: { name: 'Moldova', lat: 47.4116, lng: 28.3699 },
  LU: { name: 'Luxembourg', lat: 49.8153, lng: 6.1296 },
  MT: { name: 'Malta', lat: 35.9375, lng: 14.3754 },
  IS: { name: 'Iceland', lat: 64.9631, lng: -19.0208 },
  MC: { name: 'Monaco', lat: 43.7384, lng: 7.4246 },
  AD: { name: 'Andorra', lat: 42.5063, lng: 1.5218 },
  SM: { name: 'San Marino', lat: 43.9424, lng: 12.4578 },
  VA: { name: 'Vatican City', lat: 41.9029, lng: 12.4534 },
  LI: { name: 'Liechtenstein', lat: 47.1660, lng: 9.5554 },

  // North America
  US: { name: 'United States', lat: 37.0902, lng: -95.7129 },
  CA: { name: 'Canada', lat: 56.1304, lng: -106.3468 },
  MX: { name: 'Mexico', lat: 23.6345, lng: -102.5528 },
  GT: { name: 'Guatemala', lat: 15.7835, lng: -90.2308 },
  BZ: { name: 'Belize', lat: 17.1899, lng: -88.4976 },
  HN: { name: 'Honduras', lat: 15.2000, lng: -86.2419 },
  SV: { name: 'El Salvador', lat: 13.7942, lng: -88.8965 },
  NI: { name: 'Nicaragua', lat: 12.8654, lng: -85.2072 },
  CR: { name: 'Costa Rica', lat: 9.7489, lng: -83.7534 },
  PA: { name: 'Panama', lat: 8.5380, lng: -80.7821 },
  CU: { name: 'Cuba', lat: 21.5218, lng: -77.7812 },
  JM: { name: 'Jamaica', lat: 18.1096, lng: -77.2975 },
  HT: { name: 'Haiti', lat: 18.9712, lng: -72.2852 },
  DO: { name: 'Dominican Republic', lat: 18.7357, lng: -70.1627 },
  PR: { name: 'Puerto Rico', lat: 18.2208, lng: -66.5901 },
  TT: { name: 'Trinidad and Tobago', lat: 10.6918, lng: -61.2225 },
  BS: { name: 'Bahamas', lat: 25.0343, lng: -77.3963 },
  BB: { name: 'Barbados', lat: 13.1939, lng: -59.5432 },

  // South America
  BR: { name: 'Brazil', lat: -14.2350, lng: -51.9253 },
  AR: { name: 'Argentina', lat: -38.4161, lng: -63.6167 },
  CL: { name: 'Chile', lat: -35.6751, lng: -71.5430 },
  CO: { name: 'Colombia', lat: 4.5709, lng: -74.2973 },
  PE: { name: 'Peru', lat: -9.1900, lng: -75.0152 },
  VE: { name: 'Venezuela', lat: 6.4238, lng: -66.5897 },
  EC: { name: 'Ecuador', lat: -1.8312, lng: -78.1834 },
  BO: { name: 'Bolivia', lat: -16.2902, lng: -63.5887 },
  PY: { name: 'Paraguay', lat: -23.4425, lng: -58.4438 },
  UY: { name: 'Uruguay', lat: -32.5228, lng: -55.7658 },
  GY: { name: 'Guyana', lat: 4.8604, lng: -58.9302 },
  SR: { name: 'Suriname', lat: 3.9193, lng: -56.0278 },
  GF: { name: 'French Guiana', lat: 3.9339, lng: -53.1258 },

  // Africa
  EG: { name: 'Egypt', lat: 26.8206, lng: 30.8025 },
  ZA: { name: 'South Africa', lat: -30.5595, lng: 22.9375 },
  NG: { name: 'Nigeria', lat: 9.0820, lng: 8.6753 },
  KE: { name: 'Kenya', lat: -0.0236, lng: 37.9062 },
  ET: { name: 'Ethiopia', lat: 9.1450, lng: 40.4897 },
  GH: { name: 'Ghana', lat: 7.9465, lng: -1.0232 },
  TZ: { name: 'Tanzania', lat: -6.3690, lng: 34.8888 },
  UG: { name: 'Uganda', lat: 1.3733, lng: 32.2903 },
  DZ: { name: 'Algeria', lat: 28.0339, lng: 1.6596 },
  MA: { name: 'Morocco', lat: 31.7917, lng: -7.0926 },
  TN: { name: 'Tunisia', lat: 33.8869, lng: 9.5375 },
  LY: { name: 'Libya', lat: 26.3351, lng: 17.2283 },
  SD: { name: 'Sudan', lat: 12.8628, lng: 30.2176 },
  SS: { name: 'South Sudan', lat: 6.8770, lng: 31.3070 },
  CD: { name: 'Democratic Republic of the Congo', lat: -4.0383, lng: 21.7587 },
  AO: { name: 'Angola', lat: -11.2027, lng: 17.8739 },
  MZ: { name: 'Mozambique', lat: -18.6657, lng: 35.5296 },
  ZW: { name: 'Zimbabwe', lat: -19.0154, lng: 29.1549 },
  ZM: { name: 'Zambia', lat: -13.1339, lng: 27.8493 },
  BW: { name: 'Botswana', lat: -22.3285, lng: 24.6849 },
  NA: { name: 'Namibia', lat: -22.9576, lng: 18.4904 },
  SN: { name: 'Senegal', lat: 14.4974, lng: -14.4524 },
  CI: { name: 'Ivory Coast', lat: 7.5400, lng: -5.5471 },
  CM: { name: 'Cameroon', lat: 7.3697, lng: 12.3547 },
  RW: { name: 'Rwanda', lat: -1.9403, lng: 29.8739 },
  MG: { name: 'Madagascar', lat: -18.7669, lng: 46.8691 },
  MW: { name: 'Malawi', lat: -13.2543, lng: 34.3015 },
  ML: { name: 'Mali', lat: 17.5707, lng: -3.9962 },
  NE: { name: 'Niger', lat: 17.6078, lng: 8.0817 },
  BF: { name: 'Burkina Faso', lat: 12.2383, lng: -1.5616 },
  TD: { name: 'Chad', lat: 15.4542, lng: 18.7322 },
  SO: { name: 'Somalia', lat: 5.1521, lng: 46.1996 },
  ER: { name: 'Eritrea', lat: 15.1794, lng: 39.7823 },
  DJ: { name: 'Djibouti', lat: 11.8251, lng: 42.5903 },
  MU: { name: 'Mauritius', lat: -20.3484, lng: 57.5522 },
  GA: { name: 'Gabon', lat: -0.8037, lng: 11.6094 },
  CG: { name: 'Republic of the Congo', lat: -0.2280, lng: 15.8277 },
  CF: { name: 'Central African Republic', lat: 6.6111, lng: 20.9394 },
  GN: { name: 'Guinea', lat: 9.9456, lng: -9.6966 },
  SL: { name: 'Sierra Leone', lat: 8.4606, lng: -11.7799 },
  LR: { name: 'Liberia', lat: 6.4281, lng: -9.4295 },
  TG: { name: 'Togo', lat: 8.6195, lng: 0.8248 },
  BJ: { name: 'Benin', lat: 9.3077, lng: 2.3158 },
  MR: { name: 'Mauritania', lat: 21.0079, lng: -10.9408 },
  GM: { name: 'Gambia', lat: 13.4432, lng: -15.3101 },
  GW: { name: 'Guinea-Bissau', lat: 11.8037, lng: -15.1804 },
  CV: { name: 'Cape Verde', lat: 16.5388, lng: -23.0418 },
  ST: { name: 'Sao Tome and Principe', lat: 0.1864, lng: 6.6131 },
  GQ: { name: 'Equatorial Guinea', lat: 1.6508, lng: 10.2679 },
  BI: { name: 'Burundi', lat: -3.3731, lng: 29.9189 },
  LS: { name: 'Lesotho', lat: -29.6100, lng: 28.2336 },
  SZ: { name: 'Eswatini', lat: -26.5225, lng: 31.4659 },

  // Oceania
  AU: { name: 'Australia', lat: -25.2744, lng: 133.7751 },
  NZ: { name: 'New Zealand', lat: -40.9006, lng: 174.8860 },
  PG: { name: 'Papua New Guinea', lat: -6.3150, lng: 143.9555 },
  FJ: { name: 'Fiji', lat: -17.7134, lng: 178.0650 },
  SB: { name: 'Solomon Islands', lat: -9.6457, lng: 160.1562 },
  VU: { name: 'Vanuatu', lat: -15.3767, lng: 166.9592 },
  NC: { name: 'New Caledonia', lat: -20.9043, lng: 165.6180 },
  PF: { name: 'French Polynesia', lat: -17.6797, lng: -149.4068 },
  WS: { name: 'Samoa', lat: -13.7590, lng: -172.1046 },
  TO: { name: 'Tonga', lat: -21.1790, lng: -175.1982 },
  FM: { name: 'Micronesia', lat: 7.4256, lng: 150.5508 },
  GU: { name: 'Guam', lat: 13.4443, lng: 144.7937 },
  KI: { name: 'Kiribati', lat: -3.3704, lng: -168.7340 },
  MH: { name: 'Marshall Islands', lat: 7.1315, lng: 171.1845 },
  PW: { name: 'Palau', lat: 7.5150, lng: 134.5825 },
  NR: { name: 'Nauru', lat: -0.5228, lng: 166.9315 },
  TV: { name: 'Tuvalu', lat: -7.1095, lng: 177.6493 },
};

/**
 * Get country name from ISO 2-letter code
 */
export function getCountryName(code: string): string | null {
  if (!code) return null;
  const country = COUNTRIES[code.toUpperCase().trim()];
  return country?.name || null;
}

/**
 * Get country coordinates from ISO 2-letter code
 */
export function getCountryCoords(code: string): { lat: number; lng: number } | null {
  if (!code) return null;
  const country = COUNTRIES[code.toUpperCase().trim()];
  return country ? { lat: country.lat, lng: country.lng } : null;
}

/**
 * Get all country codes
 */
export function getAllCountryCodes(): string[] {
  return Object.keys(COUNTRIES);
}
