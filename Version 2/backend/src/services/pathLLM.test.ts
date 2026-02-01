import { describe, expect, test } from 'vitest';

describe('proposePath', () => {
  test('throws when OPENAI_API_KEY is missing', async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const { proposePath } = await import('./pathLLM');

    await expect(
      proposePath({
        companyName: 'Example Co',
        productCategory: 'semiconductors.logic',
        candidateNodeIds: ['node-1', 'node-2'],
      }),
    ).rejects.toThrow('OPENAI_API_KEY');

    if (originalKey) {
      process.env.OPENAI_API_KEY = originalKey;
    }
  });
});
