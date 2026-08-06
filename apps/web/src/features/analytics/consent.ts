export const ANALYTICS_CONSENT_STORAGE_KEY = "brega.analytics-consent.v1";

export const ANALYTICS_CONSENT_VALUES = {
  accepted: "accepted",
  rejected: "rejected",
} as const;

export type AnalyticsConsent =
  | (typeof ANALYTICS_CONSENT_VALUES)[keyof typeof ANALYTICS_CONSENT_VALUES]
  | null;

export const parseAnalyticsConsent = (
  value: string | null,
): AnalyticsConsent => {
  if (
    value === ANALYTICS_CONSENT_VALUES.accepted ||
    value === ANALYTICS_CONSENT_VALUES.rejected
  ) {
    return value;
  }

  return null;
};
