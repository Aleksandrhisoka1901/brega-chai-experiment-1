export type GalleryTransitionState = {
  displayedIndex: number;
  pendingIndex: number | null;
  phase: "idle" | "loading" | "ready" | "fading";
  selectedIndex: number;
};

export type GalleryTransitionEvent =
  | { type: "select"; index: number }
  | { type: "load"; index: number }
  | { type: "start-fade" }
  | { type: "finish-fade"; index: number };

export const initialGalleryTransitionState: GalleryTransitionState = {
  displayedIndex: 0,
  pendingIndex: null,
  phase: "idle",
  selectedIndex: 0,
};

export const activeGalleryIndex = (state: GalleryTransitionState) =>
  state.phase === "fading" && state.pendingIndex !== null
    ? state.pendingIndex
    : state.displayedIndex;

export const renderedGalleryIndexes = (state: GalleryTransitionState) =>
  state.pendingIndex === null || state.pendingIndex === state.displayedIndex
    ? [state.displayedIndex]
    : [state.displayedIndex, state.pendingIndex];

export function galleryTransitionReducer(
  state: GalleryTransitionState,
  event: GalleryTransitionEvent,
): GalleryTransitionState {
  if (event.type === "select") {
    const activeIndex = activeGalleryIndex(state);
    if (event.index === activeIndex) {
      return {
        displayedIndex: activeIndex,
        pendingIndex: null,
        phase: "idle",
        selectedIndex: event.index,
      };
    }
    return {
      displayedIndex: activeIndex,
      pendingIndex: event.index,
      phase:
        state.phase === "fading" && event.index === state.displayedIndex
          ? "ready"
          : "loading",
      selectedIndex: event.index,
    };
  }

  if (event.type === "load") {
    return state.phase === "loading" && state.pendingIndex === event.index
      ? { ...state, phase: "ready" }
      : state;
  }

  if (event.type === "start-fade") {
    return state.phase === "ready" ? { ...state, phase: "fading" } : state;
  }

  if (
    (state.phase !== "ready" && state.phase !== "fading") ||
    state.pendingIndex === null ||
    state.pendingIndex !== event.index
  ) {
    return state;
  }
  return {
    displayedIndex: event.index,
    pendingIndex: null,
    phase: "idle",
    selectedIndex: event.index,
  };
}
