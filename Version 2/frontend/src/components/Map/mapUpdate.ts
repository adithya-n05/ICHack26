type UpdateScheduler = {
  request: (isReady: boolean) => void;
  onReady: () => void;
};

export function createMapUpdateScheduler(onUpdate: () => void): UpdateScheduler {
  let pending = false;

  return {
    request(isReady: boolean) {
      if (isReady) {
        pending = false;
        onUpdate();
        return;
      }
      pending = true;
    },
    onReady() {
      if (!pending) return;
      pending = false;
      onUpdate();
    },
  };
}
