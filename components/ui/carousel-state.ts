type NavigationApi = {
  on(event: 'reInit' | 'select', callback: () => void): unknown;
  off(event: 'reInit' | 'select', callback: () => void): unknown;
  canScrollPrev(): boolean;
  canScrollNext(): boolean;
};

export function subscribeNavigation(
  api: NavigationApi | undefined,
  onChange: () => void,
) {
  if (!api) return () => {};
  api.on('reInit', onChange);
  api.on('select', onChange);
  return () => {
    api.off('reInit', onChange);
    api.off('select', onChange);
  };
}

export function navigationSnapshot(api: NavigationApi | undefined) {
  return (api?.canScrollPrev() ? 1 : 0) | (api?.canScrollNext() ? 2 : 0);
}
