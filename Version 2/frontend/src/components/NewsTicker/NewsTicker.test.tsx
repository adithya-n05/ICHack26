import { render } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { NewsTicker } from './NewsTicker';

describe('NewsTicker', () => {
  test('does not crash when items change from empty to non-empty', () => {
    const items = [
      { id: 'n1', title: 'Test', source: 'Source' },
      { id: 'n2', title: 'Test 2', source: 'Source' },
    ];
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      const { rerender } = render(<NewsTicker items={[]} />);
      rerender(<NewsTicker items={items} />);
    }).not.toThrow();

    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Expected static flag was missing'),
    );
    errorSpy.mockRestore();
  });
});
