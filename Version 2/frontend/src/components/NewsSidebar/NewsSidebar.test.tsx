import { act, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { NewsSidebar } from './NewsSidebar';

const items = [
  { id: 'n1', title: 'First item', source: 'Source A' },
  { id: 'n2', title: 'Second item', source: 'Source B' },
  { id: 'n3', title: 'Third item', source: 'Source C' },
];

describe('NewsSidebar', () => {
  test('reveals one new item every minute', () => {
    vi.useFakeTimers();
    render(<NewsSidebar items={items} initialVisible={1} updateIntervalMs={60000} />);

    expect(screen.getByText('First item')).toBeInTheDocument();
    expect(screen.queryByText('Second item')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.getByText('Second item')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.getByText('Third item')).toBeInTheDocument();

    vi.useRealTimers();
  });
});
