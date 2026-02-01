// backend/src/services/countryCoordinates.ts
// Comprehensive mapping of country codes to approximate center coordinates

export const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Asia
  CN: { lat: 35.8617, lng: 104.1954 },  // China
  TW: { lat: 23.6978, lng: 120.9605 },  // Taiwan
  JP: { lat: 36.2048, lng: 138.2529 },  // Japan
  KR: { lat: 35.9078, lng: 127.7669 },  // South Korea
  KP: { lat: 40.3399, lng: 127.5101 },  // North Korea
  IN: { lat: 20.5937, lng: 78.9629 },   // India
  PK: { lat: 30.3753, lng: 69.3451 },   // Pakistan
  BD: { lat: 23.6850, lng: 90.3563 },   // Bangladesh
  VN: { lat: 14.0583, lng: 108.2772 },  // Vietnam
  TH: { lat: 15.8700, lng: 100.9925 },  // Thailand
  MY: { lat: 4.2105, lng: 101.9758 },   // Malaysia
  SG: { lat: 1.3521, lng: 103.8198 },   // Singapore
  ID: { lat: -0.7893, lng: 113.9213 },  // Indonesia
  PH: { lat: 12.8797, lng: 121.7740 },  // Philippines
  MM: { lat: 21.9162, lng: 95.9560 },   // Myanmar
  KH: { lat: 12.5657, lng: 104.9910 },  // Cambodia
  LA: { lat: 19.8563, lng: 102.4955 },  // Laos
  NP: { lat: 28.3949, lng: 84.1240 },   // Nepal
  LK: { lat: 7.8731, lng: 80.7718 },    // Sri Lanka
  AF: { lat: 33.9391, lng: 67.7100 },   // Afghanistan
  MN: { lat: 46.8625, lng: 103.8467 },  // Mongolia
  KZ: { lat: 48.0196, lng: 66.9237 },   // Kazakhstan
  UZ: { lat: 41.3775, lng: 64.5853 },   // Uzbekistan
  TM: { lat: 38.9697, lng: 59.5563 },   // Turkmenistan
  KG: { lat: 41.2044, lng: 74.7661 },   // Kyrgyzstan
  TJ: { lat: 38.8610, lng: 71.2761 },   // Tajikistan
  BT: { lat: 27.5142, lng: 90.4336 },   // Bhutan
  MV: { lat: 3.2028, lng: 73.2207 },    // Maldives
  BN: { lat: 4.5353, lng: 114.7277 },   // Brunei
  TL: { lat: -8.8742, lng: 125.7275 },  // Timor-Leste

  // Middle East
  IR: { lat: 32.4279, lng: 53.6880 },   // Iran
  IQ: { lat: 33.2232, lng: 43.6793 },   // Iraq
  SA: { lat: 23.8859, lng: 45.0792 },   // Saudi Arabia
  AE: { lat: 23.4241, lng: 53.8478 },   // UAE
  IL: { lat: 31.0461, lng: 34.8516 },   // Israel
  JO: { lat: 30.5852, lng: 36.2384 },   // Jordan
  LB: { lat: 33.8547, lng: 35.8623 },   // Lebanon
  SY: { lat: 34.8021, lng: 38.9968 },   // Syria
  YE: { lat: 15.5527, lng: 48.5164 },   // Yemen
  OM: { lat: 21.4735, lng: 55.9754 },   // Oman
  KW: { lat: 29.3117, lng: 47.4818 },   // Kuwait
  QA: { lat: 25.3548, lng: 51.1839 },   // Qatar
  BH: { lat: 26.0667, lng: 50.5577 },   // Bahrain
  TR: { lat: 38.9637, lng: 35.2433 },   // Turkey
  CY: { lat: 35.1264, lng: 33.4299 },   // Cyprus
  GE: { lat: 42.3154, lng: 43.3569 },   // Georgia
  AM: { lat: 40.0691, lng: 45.0382 },   // Armenia
  AZ: { lat: 40.1431, lng: 47.5769 },   // Azerbaijan

  // Europe
  GB: { lat: 55.3781, lng: -3.4360 },   // United Kingdom
  UK: { lat: 55.3781, lng: -3.4360 },   // UK alias
  DE: { lat: 51.1657, lng: 10.4515 },   // Germany
  FR: { lat: 46.2276, lng: 2.2137 },    // France
  IT: { lat: 41.8719, lng: 12.5674 },   // Italy
  ES: { lat: 40.4637, lng: -3.7492 },   // Spain
  PT: { lat: 39.3999, lng: -8.2245 },   // Portugal
  NL: { lat: 52.1326, lng: 5.2913 },    // Netherlands
  BE: { lat: 50.5039, lng: 4.4699 },    // Belgium
  AT: { lat: 47.5162, lng: 14.5501 },   // Austria
  CH: { lat: 46.8182, lng: 8.2275 },    // Switzerland
  PL: { lat: 51.9194, lng: 19.1451 },   // Poland
  CZ: { lat: 49.8175, lng: 15.4730 },   // Czech Republic
  SK: { lat: 48.6690, lng: 19.6990 },   // Slovakia
  HU: { lat: 47.1625, lng: 19.5033 },   // Hungary
  RO: { lat: 45.9432, lng: 24.9668 },   // Romania
  BG: { lat: 42.7339, lng: 25.4858 },   // Bulgaria
  GR: { lat: 39.0742, lng: 21.8243 },   // Greece
  SE: { lat: 60.1282, lng: 18.6435 },   // Sweden
  NO: { lat: 60.4720, lng: 8.4689 },    // Norway
  FI: { lat: 61.9241, lng: 25.7482 },   // Finland
  DK: { lat: 56.2639, lng: 9.5018 },    // Denmark
  IE: { lat: 53.4129, lng: -8.2439 },   // Ireland
  RU: { lat: 61.5240, lng: 105.3188 },  // Russia
  UA: { lat: 48.3794, lng: 31.1656 },   // Ukraine
  BY: { lat: 53.7098, lng: 27.9534 },   // Belarus
  LT: { lat: 55.1694, lng: 23.8813 },   // Lithuania
  LV: { lat: 56.8796, lng: 24.6032 },   // Latvia
  EE: { lat: 58.5953, lng: 25.0136 },   // Estonia
  HR: { lat: 45.1000, lng: 15.2000 },   // Croatia
  SI: { lat: 46.1512, lng: 14.9955 },   // Slovenia
  RS: { lat: 44.0165, lng: 21.0059 },   // Serbia
  BA: { lat: 43.9159, lng: 17.6791 },   // Bosnia and Herzegovina
  ME: { lat: 42.7087, lng: 19.3744 },   // Montenegro
  MK: { lat: 41.5124, lng: 21.7465 },   // North Macedonia
  AL: { lat: 41.1533, lng: 20.1683 },   // Albania
  XK: { lat: 42.6026, lng: 20.9030 },   // Kosovo
  MD: { lat: 47.4116, lng: 28.3699 },   // Moldova
  LU: { lat: 49.8153, lng: 6.1296 },    // Luxembourg
  MT: { lat: 35.9375, lng: 14.3754 },   // Malta
  IS: { lat: 64.9631, lng: -19.0208 },  // Iceland
  MC: { lat: 43.7384, lng: 7.4246 },    // Monaco
  AD: { lat: 42.5063, lng: 1.5218 },    // Andorra
  SM: { lat: 43.9424, lng: 12.4578 },   // San Marino
  VA: { lat: 41.9029, lng: 12.4534 },   // Vatican City
  LI: { lat: 47.1660, lng: 9.5554 },    // Liechtenstein

  // North America
  US: { lat: 37.0902, lng: -95.7129 },  // United States
  CA: { lat: 56.1304, lng: -106.3468 }, // Canada
  MX: { lat: 23.6345, lng: -102.5528 }, // Mexico
  GT: { lat: 15.7835, lng: -90.2308 },  // Guatemala
  BZ: { lat: 17.1899, lng: -88.4976 },  // Belize
  HN: { lat: 15.2000, lng: -86.2419 },  // Honduras
  SV: { lat: 13.7942, lng: -88.8965 },  // El Salvador
  NI: { lat: 12.8654, lng: -85.2072 },  // Nicaragua
  CR: { lat: 9.7489, lng: -83.7534 },   // Costa Rica
  PA: { lat: 8.5380, lng: -80.7821 },   // Panama
  CU: { lat: 21.5218, lng: -77.7812 },  // Cuba
  JM: { lat: 18.1096, lng: -77.2975 },  // Jamaica
  HT: { lat: 18.9712, lng: -72.2852 },  // Haiti
  DO: { lat: 18.7357, lng: -70.1627 },  // Dominican Republic
  PR: { lat: 18.2208, lng: -66.5901 },  // Puerto Rico
  TT: { lat: 10.6918, lng: -61.2225 },  // Trinidad and Tobago
  BS: { lat: 25.0343, lng: -77.3963 },  // Bahamas
  BB: { lat: 13.1939, lng: -59.5432 },  // Barbados

  // South America
  BR: { lat: -14.2350, lng: -51.9253 }, // Brazil
  AR: { lat: -38.4161, lng: -63.6167 }, // Argentina
  CL: { lat: -35.6751, lng: -71.5430 }, // Chile
  CO: { lat: 4.5709, lng: -74.2973 },   // Colombia
  PE: { lat: -9.1900, lng: -75.0152 },  // Peru
  VE: { lat: 6.4238, lng: -66.5897 },   // Venezuela
  EC: { lat: -1.8312, lng: -78.1834 },  // Ecuador
  BO: { lat: -16.2902, lng: -63.5887 }, // Bolivia
  PY: { lat: -23.4425, lng: -58.4438 }, // Paraguay
  UY: { lat: -32.5228, lng: -55.7658 }, // Uruguay
  GY: { lat: 4.8604, lng: -58.9302 },   // Guyana
  SR: { lat: 3.9193, lng: -56.0278 },   // Suriname
  GF: { lat: 3.9339, lng: -53.1258 },   // French Guiana

  // Africa
  EG: { lat: 26.8206, lng: 30.8025 },   // Egypt
  ZA: { lat: -30.5595, lng: 22.9375 },  // South Africa
  NG: { lat: 9.0820, lng: 8.6753 },     // Nigeria
  KE: { lat: -0.0236, lng: 37.9062 },   // Kenya
  ET: { lat: 9.1450, lng: 40.4897 },    // Ethiopia
  GH: { lat: 7.9465, lng: -1.0232 },    // Ghana
  TZ: { lat: -6.3690, lng: 34.8888 },   // Tanzania
  UG: { lat: 1.3733, lng: 32.2903 },    // Uganda
  DZ: { lat: 28.0339, lng: 1.6596 },    // Algeria
  MA: { lat: 31.7917, lng: -7.0926 },   // Morocco
  TN: { lat: 33.8869, lng: 9.5375 },    // Tunisia
  LY: { lat: 26.3351, lng: 17.2283 },   // Libya
  SD: { lat: 12.8628, lng: 30.2176 },   // Sudan
  SS: { lat: 6.8770, lng: 31.3070 },    // South Sudan
  CD: { lat: -4.0383, lng: 21.7587 },   // DR Congo
  AO: { lat: -11.2027, lng: 17.8739 },  // Angola
  MZ: { lat: -18.6657, lng: 35.5296 },  // Mozambique
  ZW: { lat: -19.0154, lng: 29.1549 },  // Zimbabwe
  ZM: { lat: -13.1339, lng: 27.8493 },  // Zambia
  BW: { lat: -22.3285, lng: 24.6849 },  // Botswana
  NA: { lat: -22.9576, lng: 18.4904 },  // Namibia
  SN: { lat: 14.4974, lng: -14.4524 },  // Senegal
  CI: { lat: 7.5400, lng: -5.5471 },    // Ivory Coast
  CM: { lat: 7.3697, lng: 12.3547 },    // Cameroon
  RW: { lat: -1.9403, lng: 29.8739 },   // Rwanda
  MG: { lat: -18.7669, lng: 46.8691 },  // Madagascar
  MW: { lat: -13.2543, lng: 34.3015 },  // Malawi
  ML: { lat: 17.5707, lng: -3.9962 },   // Mali
  NE: { lat: 17.6078, lng: 8.0817 },    // Niger
  BF: { lat: 12.2383, lng: -1.5616 },   // Burkina Faso
  TD: { lat: 15.4542, lng: 18.7322 },   // Chad
  SO: { lat: 5.1521, lng: 46.1996 },    // Somalia
  ER: { lat: 15.1794, lng: 39.7823 },   // Eritrea
  DJ: { lat: 11.8251, lng: 42.5903 },   // Djibouti
  MU: { lat: -20.3484, lng: 57.5522 },  // Mauritius
  GA: { lat: -0.8037, lng: 11.6094 },   // Gabon
  CG: { lat: -0.2280, lng: 15.8277 },   // Republic of Congo
  CF: { lat: 6.6111, lng: 20.9394 },    // Central African Republic
  GN: { lat: 9.9456, lng: -9.6966 },    // Guinea
  SL: { lat: 8.4606, lng: -11.7799 },   // Sierra Leone
  LR: { lat: 6.4281, lng: -9.4295 },    // Liberia
  TG: { lat: 8.6195, lng: 0.8248 },     // Togo
  BJ: { lat: 9.3077, lng: 2.3158 },     // Benin
  MR: { lat: 21.0079, lng: -10.9408 },  // Mauritania
  GM: { lat: 13.4432, lng: -15.3101 },  // Gambia
  GW: { lat: 11.8037, lng: -15.1804 },  // Guinea-Bissau
  CV: { lat: 16.5388, lng: -23.0418 },  // Cape Verde
  ST: { lat: 0.1864, lng: 6.6131 },     // Sao Tome and Principe
  GQ: { lat: 1.6508, lng: 10.2679 },    // Equatorial Guinea
  BI: { lat: -3.3731, lng: 29.9189 },   // Burundi
  LS: { lat: -29.6100, lng: 28.2336 },  // Lesotho
  SZ: { lat: -26.5225, lng: 31.4659 },  // Eswatini

  // Oceania
  AU: { lat: -25.2744, lng: 133.7751 }, // Australia
  NZ: { lat: -40.9006, lng: 174.8860 }, // New Zealand
  PG: { lat: -6.3150, lng: 143.9555 },  // Papua New Guinea
  FJ: { lat: -17.7134, lng: 178.0650 }, // Fiji
  SB: { lat: -9.6457, lng: 160.1562 },  // Solomon Islands
  VU: { lat: -15.3767, lng: 166.9592 }, // Vanuatu
  NC: { lat: -20.9043, lng: 165.6180 }, // New Caledonia
  PF: { lat: -17.6797, lng: -149.4068 }, // French Polynesia
  WS: { lat: -13.7590, lng: -172.1046 }, // Samoa
  TO: { lat: -21.1790, lng: -175.1982 }, // Tonga
  FM: { lat: 7.4256, lng: 150.5508 },   // Micronesia
  GU: { lat: 13.4443, lng: 144.7937 },  // Guam
  KI: { lat: -3.3704, lng: -168.7340 }, // Kiribati
  MH: { lat: 7.1315, lng: 171.1845 },   // Marshall Islands
  PW: { lat: 7.5150, lng: 134.5825 },   // Palau
  NR: { lat: -0.5228, lng: 166.9315 },  // Nauru
  TV: { lat: -7.1095, lng: 177.6493 },  // Tuvalu
};

/**
 * Get coordinates for a country code
 * @param countryCode - ISO 2-letter country code
 * @returns Coordinates or null if not found
 */
export function getCountryCoordinates(countryCode: string): { lat: number; lng: number } | null {
  if (!countryCode) return null;
  const code = countryCode.toUpperCase().trim();
  return COUNTRY_COORDINATES[code] || null;
}
