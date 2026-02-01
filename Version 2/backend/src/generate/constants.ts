export type RegionCenter = {
  code: string;
  name: string;
  lat: number;
  lng: number;
  country: string;
  city: string;
};

export const REGION_CENTERS: RegionCenter[] = [
  { code: 'US-W', name: 'US West', lat: 37.4, lng: -122.1, country: 'United States', city: 'San Jose' },
  { code: 'US-SW', name: 'US Southwest', lat: 33.4, lng: -112.1, country: 'United States', city: 'Phoenix' },
  { code: 'US-NE', name: 'US Northeast', lat: 42.3, lng: -71.1, country: 'United States', city: 'Boston' },
  { code: 'TW', name: 'Taiwan', lat: 24.0, lng: 121.0, country: 'Taiwan', city: 'Hsinchu' },
  { code: 'KR', name: 'South Korea', lat: 37.5, lng: 127.0, country: 'South Korea', city: 'Seoul' },
  { code: 'JP', name: 'Japan', lat: 35.7, lng: 139.7, country: 'Japan', city: 'Tokyo' },
  { code: 'CN', name: 'China', lat: 31.2, lng: 121.5, country: 'China', city: 'Shanghai' },
  { code: 'SG', name: 'Singapore', lat: 1.3, lng: 103.8, country: 'Singapore', city: 'Singapore' },
  { code: 'MY', name: 'Malaysia', lat: 3.1, lng: 101.7, country: 'Malaysia', city: 'Kuala Lumpur' },
  { code: 'VN', name: 'Vietnam', lat: 21.0, lng: 105.8, country: 'Vietnam', city: 'Hanoi' },
  { code: 'NL', name: 'Netherlands', lat: 52.4, lng: 4.9, country: 'Netherlands', city: 'Amsterdam' },
  { code: 'DE', name: 'Germany', lat: 48.1, lng: 11.6, country: 'Germany', city: 'Munich' },
  { code: 'FR', name: 'France', lat: 48.8, lng: 2.3, country: 'France', city: 'Paris' },
];

export const PART_CATEGORIES = [
  { category: 'semiconductors.logic', parts: ['Logic IC', 'MCU', 'SoC'], priceRange: [4, 45] },
  { category: 'semiconductors.memory', parts: ['DRAM', 'NAND Flash', 'SRAM'], priceRange: [3, 25] },
  { category: 'semiconductors.discrete', parts: ['MOSFET', 'Diode', 'Transistor'], priceRange: [0.1, 3] },
  { category: 'semiconductors.wafer', parts: ['300mm Wafer', '200mm Wafer'], priceRange: [80, 300] },
  { category: 'components.passives', parts: ['Resistor', 'Capacitor', 'Inductor'], priceRange: [0.01, 0.5] },
  { category: 'components.connectors', parts: ['USB-C Connector', 'RF Connector', 'Board Connector'], priceRange: [0.2, 6] },
  { category: 'equipment.lithography', parts: ['Stepper', 'Scanner Module'], priceRange: [100000, 1200000] },
  { category: 'equipment.test', parts: ['Test Handler', 'Probe Card'], priceRange: [5000, 250000] },
  { category: 'equipment.packaging', parts: ['Wire Bonder', 'Package Substrate'], priceRange: [2000, 500000] },
  { category: 'subassemblies.pcbs', parts: ['High-speed PCB', 'HDI PCB'], priceRange: [8, 150] },
  { category: 'subassemblies.modules', parts: ['Power Module', 'RF Module'], priceRange: [12, 200] },
  { category: 'finished_goods.servers', parts: ['Server Board', 'Backplane'], priceRange: [120, 800] },
  { category: 'finished_goods.mobile', parts: ['Camera Module', 'Display Driver'], priceRange: [5, 70] },
  { category: 'finished_goods.automotive_electronics', parts: ['ECU', 'Radar Module'], priceRange: [50, 400] },
];
