/* @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NewsTicker, type NewsItem } from './NewsTicker';

describe('NewsTicker', () => {
  it('does not log errors when items appear after empty state', () => {
    const items: NewsItem[] = [
      { id: 'news-1', title: 'First', source: 'Source A' },
      { id: 'news-2', title: 'Second', source: 'Source B' },
    ];
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender, unmount } = render(<NewsTicker items={[]} />);

    rerender(<NewsTicker items={items} />);
    unmount();

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
