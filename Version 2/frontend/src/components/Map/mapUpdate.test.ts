import { describe, expect, test, vi } from 'vitest';

import { createMapUpdateScheduler } from './mapUpdate';

describe('createMapUpdateScheduler', () => {
  test('defers update until ready', () => {
    const onUpdate = vi.fn();
    const scheduler = createMapUpdateScheduler(onUpdate);

    scheduler.request(false);
    expect(onUpdate).not.toHaveBeenCalled();

    scheduler.onReady();
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  test('updates immediately when ready', () => {
    const onUpdate = vi.fn();
    const scheduler = createMapUpdateScheduler(onUpdate);

    scheduler.request(true);
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
});
