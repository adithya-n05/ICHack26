export const USER_CONNECTION_LINE_COLOR = 'rgba(255, 72, 72, 1)';
export const USER_CONNECTION_GLOW_COLOR = 'rgba(255, 72, 72, 0.85)';
export const USER_CONNECTION_ARROW_COLOR = 'rgba(255, 72, 72, 0.95)';

export const USER_CONNECTION_NON_DEVARAJA_LINE_COLOR = 'rgba(232, 232, 232, 0.95)';
export const USER_CONNECTION_NON_DEVARAJA_GLOW_COLOR = 'rgba(232, 232, 232, 0.75)';
export const USER_CONNECTION_NON_DEVARAJA_ARROW_COLOR = 'rgba(232, 232, 232, 0.95)';

export const DEVARAJA_USER_CONNECTION_EXPR = [
  'all',
  ['boolean', ['get', 'is_user_connection'], false],
  ['==', ['get', 'to_node_id'], 'market-devaraja-market'],
];
