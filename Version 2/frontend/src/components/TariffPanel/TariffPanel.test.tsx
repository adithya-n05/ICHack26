import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import { TariffPanel } from './TariffPanel';

describe('TariffPanel', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders tariff explanation content', () => {
    render(
      <TariffPanel
        summary={{
          label: 'Tariff Heatmap',
          radiusKm: 520,
          count: 10,
          avgSeverity: 7.2,
          dateRange: '2025-12-10 → 2026-01-15',
          locationText: '35.0, 120.0',
          entries: [
            {
              id: 'tariff-1',
              title: 'Tariff escalation: US-China tech goods',
              leviedBy: 'Office of the U.S. Trade Representative',
              target: 'China',
              description: 'Levied by the USTR targeting advanced electronics imports.',
              dateRange: '2026-01-10 → Ongoing',
            },
          ],
        }}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByText('Tariff Heatmap')).toBeInTheDocument();
    expect(screen.getByText('Explanation')).toBeInTheDocument();
    expect(screen.getByText('Tariff escalation: US-China tech goods')).toBeInTheDocument();
    expect(screen.getByText(/Levied by:.*Office of the U.S. Trade Representative/i)).toBeInTheDocument();
  });
});
