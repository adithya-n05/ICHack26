import { describe, expect, test } from 'vitest';
import { generateSuppliers } from './suppliers';

describe('generateSuppliers', () => {
  test('creates the requested number of suppliers', () => {
    const suppliers = generateSuppliers(110);
    expect(suppliers).toHaveLength(110);
  });
});
