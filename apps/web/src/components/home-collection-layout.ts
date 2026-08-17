export type HomeCollectionLayout = {
  mode: "hidden" | "fixed" | "slider";
  visibleCardCount: number;
};

export function getHomeCollectionLayout(count: number): HomeCollectionLayout {
  if (!Number.isInteger(count) || count < 0) {
    throw new TypeError("Home collection count must be a non-negative integer");
  }

  if (count === 0) return { mode: "hidden", visibleCardCount: 0 };
  if (count <= 4) return { mode: "fixed", visibleCardCount: count };
  return { mode: "slider", visibleCardCount: 4 };
}
