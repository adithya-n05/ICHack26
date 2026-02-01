export function scorePath(input: {
  cost: number;
  leadTime: number;
  tariff: number;
  risk: number;
}) {
  return input.cost * 0.4 + input.leadTime * 0.3 + input.tariff * 0.2 + input.risk * 0.1;
}
