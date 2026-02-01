import { describe, expect, test } from 'vitest';

import { scorePath } from './pathScoring';

describe('scorePath', () => {
  test('scores path with cost, lead time, tariff, and risk', () => {
    const score = scorePath({ cost: 10, leadTime: 5, tariff: 2, risk: 1 });

    expect(score).toBeGreaterThan(0);
  });
});
