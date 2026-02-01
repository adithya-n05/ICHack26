import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import { DetailPanel } from './DetailPanel';

const baseConnection = {
  id: 'conn-1',
  from_node_id: 'node-a',
  to_node_id: 'node-b',
  transport_mode: 'sea',
  status: 'monitoring',
  is_user_connection: false,
};

describe('DetailPanel alternatives', () => {
  afterEach(() => {
    cleanup();
  });

  test('shows alternative suppliers for amber+ status', () => {
    render(
      <DetailPanel
        selectedNode={null}
        selectedConnection={baseConnection}
        alternativeSuppliers={[
          { id: 'alt-1', name: 'Alt Supplier', country: 'Japan', lat: 1, lng: 2 },
        ]}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByText('Alternative Suppliers')).toBeInTheDocument();
    expect(screen.getByText('Alt Supplier')).toBeInTheDocument();
  });

  test('hides alternative suppliers when status is healthy', () => {
    render(
      <DetailPanel
        selectedNode={null}
        selectedConnection={{ ...baseConnection, status: 'healthy' }}
        alternativeSuppliers={[
          { id: 'alt-1', name: 'Alt Supplier', country: 'Japan', lat: 1, lng: 2 },
        ]}
        onClose={() => undefined}
      />,
    );

    expect(screen.queryByText('Alternative Suppliers')).toBeNull();
  });
});
