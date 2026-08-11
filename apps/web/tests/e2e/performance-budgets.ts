export const performanceBudgets = {
  webVitals: {
    lcpMs: 2_500,
    cls: 0.1,
  },
  assets: {
    initialJsBytes: 180 * 1024,
    fontsBytes: 300 * 1024,
    heroDesktopBytes: 350 * 1024,
    heroMobileBytes: 220 * 1024,
    cardImageBytes: 160 * 1024,
  },
} as const;
