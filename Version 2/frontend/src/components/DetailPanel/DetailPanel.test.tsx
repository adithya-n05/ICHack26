import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

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

  test('shows delete button for user connections', () => {
    const onDeleteConnection = vi.fn();
    render(
      <DetailPanel
        selectedNode={null}
        selectedConnection={{ ...baseConnection, is_user_connection: true }}
        alternativeSuppliers={[]}
        onClose={() => undefined}
        onDeleteConnection={onDeleteConnection}
      />,
    );

    const deleteButton = screen.getByRole('button', { name: /delete connection/i });
    fireEvent.click(deleteButton);
    expect(onDeleteConnection).toHaveBeenCalledWith(baseConnection.id);
  });
});
