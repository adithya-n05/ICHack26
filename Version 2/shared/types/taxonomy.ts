export type ProductCategory =
  | 'semiconductors.logic'
  | 'semiconductors.memory'
  | 'semiconductors.discrete'
  | 'semiconductors.wafer'
  | 'components.passives'
  | 'components.connectors'
  | 'equipment.lithography'
  | 'equipment.test'
  | 'equipment.packaging'
  | 'subassemblies.pcbs'
  | 'subassemblies.modules'
  | 'finished_goods.servers'
  | 'finished_goods.mobile'
  | 'finished_goods.automotive_electronics';

export const HS4_BY_CATEGORY: Record<ProductCategory, string[]> = {
  'semiconductors.logic': ['8542'],
  'semiconductors.memory': ['8542'],
  'semiconductors.discrete': ['8541'],
  'semiconductors.wafer': ['3818'],
  'components.passives': ['8533', '8532'],
  'components.connectors': ['8536'],
  'equipment.lithography': ['8486'],
  'equipment.test': ['9030'],
  'equipment.packaging': ['8479'],
  'subassemblies.pcbs': ['8534'],
  'subassemblies.modules': ['8473'],
  'finished_goods.servers': ['8471'],
  'finished_goods.mobile': ['8517'],
  'finished_goods.automotive_electronics': ['8537'],
};
