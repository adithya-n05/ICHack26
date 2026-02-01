import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import App from './App';

vi.mock('./components/Map', () => ({
  Map: () => <div data-testid="map" />,
}));

vi.mock('./components/DetailPanel', () => ({
  DetailPanel: () => <div data-testid="detail-panel" />,
}));

describe('App', () => {
  test('renders the news sidebar', () => {
    render(<App />);
    expect(screen.getByText(/loading news feed/i)).toBeInTheDocument();
  });

  test('does not use strong panel borders', () => {
    const { container } = render(<App />);
    const bordered = container.querySelectorAll('.border-border-color');
    expect(bordered.length).toBe(0);
  });
});
