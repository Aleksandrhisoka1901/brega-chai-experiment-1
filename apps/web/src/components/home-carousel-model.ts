export function getCarouselControls(count: number, page: number) {
  const lastPage = Math.max(0, Math.ceil(count / 4) - 1);
  return {
    visible: count > 4,
    previousDisabled: page <= 0,
    nextDisabled: page >= lastPage,
  };
}

export function moveCarouselPage(page: number, delta: -1 | 1, count: number) {
  const lastPage = Math.max(0, Math.ceil(count / 4) - 1);
  return Math.min(lastPage, Math.max(0, page + delta));
}
