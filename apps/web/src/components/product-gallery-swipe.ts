const MIN_SWIPE_DISTANCE_PX = 48;
const SWIPE_DISTANCE_RATIO = 0.12;
const HORIZONTAL_DOMINANCE_RATIO = 1.2;

export function getGallerySwipeStep({
  endX,
  endY,
  startX,
  startY,
  width,
}: {
  endX: number;
  endY: number;
  startX: number;
  startY: number;
  width: number;
}): -1 | 0 | 1 {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const horizontalDistance = Math.abs(deltaX);
  const threshold = Math.max(
    MIN_SWIPE_DISTANCE_PX,
    width * SWIPE_DISTANCE_RATIO,
  );

  if (
    horizontalDistance < threshold ||
    horizontalDistance <= Math.abs(deltaY) * HORIZONTAL_DOMINANCE_RATIO
  ) {
    return 0;
  }

  return deltaX < 0 ? 1 : -1;
}
