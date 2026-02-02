import { describe, expect, test } from 'vitest';

import {
  DEVARAJA_USER_CONNECTION_EXPR,
  USER_CONNECTION_ARROW_COLOR,
  USER_CONNECTION_GLOW_COLOR,
  USER_CONNECTION_LINE_COLOR,
  USER_CONNECTION_NON_DEVARAJA_ARROW_COLOR,
  USER_CONNECTION_NON_DEVARAJA_GLOW_COLOR,
  USER_CONNECTION_NON_DEVARAJA_LINE_COLOR,
} from './userConnectionStyle';

describe('user connection styles', () => {
  test('uses red styling for user connections', () => {
    expect(USER_CONNECTION_LINE_COLOR).toBe('rgba(255, 72, 72, 1)');
    expect(USER_CONNECTION_GLOW_COLOR).toBe('rgba(255, 72, 72, 0.85)');
    expect(USER_CONNECTION_ARROW_COLOR).toBe('rgba(255, 72, 72, 0.95)');
  });

  test('uses white styling for non-Devaraja user connections', () => {
    expect(USER_CONNECTION_NON_DEVARAJA_LINE_COLOR).toBe('rgba(232, 232, 232, 0.95)');
    expect(USER_CONNECTION_NON_DEVARAJA_GLOW_COLOR).toBe('rgba(232, 232, 232, 0.75)');
    expect(USER_CONNECTION_NON_DEVARAJA_ARROW_COLOR).toBe('rgba(232, 232, 232, 0.95)');
  });

  test('only highlights user connections to Devaraja', () => {
    expect(DEVARAJA_USER_CONNECTION_EXPR).toEqual([
      'all',
      ['boolean', ['get', 'is_user_connection'], false],
      ['==', ['get', 'to_node_id'], 'market-devaraja-market'],
    ]);
  });
});
