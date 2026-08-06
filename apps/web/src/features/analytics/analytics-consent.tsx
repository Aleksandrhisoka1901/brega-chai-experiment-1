"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "./analytics-consent.module.css";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  ANALYTICS_CONSENT_VALUES,
  type AnalyticsConsent as AnalyticsConsentValue,
  parseAnalyticsConsent,
} from "./consent";
import { YandexMetrika } from "./yandex-metrika";

const isProduction = process.env.NODE_ENV === "production";

const readStoredConsent = () => {
  try {
    return parseAnalyticsConsent(
      window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY),
    );
  } catch {
    return null;
  }
};

export function AnalyticsConsent() {
  const [consent, setConsent] = useState<AnalyticsConsentValue>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setConsent(readStoredConsent());
    setIsReady(true);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== ANALYTICS_CONSENT_STORAGE_KEY) return;
      setConsent(parseAnalyticsConsent(event.newValue));
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const chooseConsent = useCallback(
    (value: Exclude<AnalyticsConsentValue, null>) => {
      setConsent(value);
      try {
        window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, value);
      } catch {
        // The current-page choice still applies when storage is unavailable.
      }
    },
    [],
  );

  return (
    <>
      {isProduction && consent === ANALYTICS_CONSENT_VALUES.accepted ? (
        <YandexMetrika />
      ) : null}

      {isReady && consent === null ? (
        <aside
          aria-labelledby="analytics-consent-title"
          className={styles.banner}
          data-analytics-consent
        >
          <p className={styles.eyebrow} id="analytics-consent-title">
            Настройки приватности
          </p>
          <div className={styles.content}>
            <p className={styles.text}>
              Мы используем файлы cookie и аналитические сервисы, чтобы
              понимать, как пользуются сайтом, и делать его удобнее.
            </p>
            <div className={styles.actions}>
              <a
                className={`${styles.button} ${styles.detailsButton}`}
                href="/legal/privacy.pdf"
                rel="noopener noreferrer"
                target="_blank"
              >
                Подробнее
              </a>
              <div className={styles.decisionActions}>
                <button
                  className={`${styles.button} ${styles.reject}`}
                  onClick={() =>
                    chooseConsent(ANALYTICS_CONSENT_VALUES.rejected)
                  }
                  type="button"
                >
                  Отклонить
                </button>
                <button
                  className={`${styles.button} ${styles.accept}`}
                  onClick={() =>
                    chooseConsent(ANALYTICS_CONSENT_VALUES.accepted)
                  }
                  type="button"
                >
                  Принять
                </button>
              </div>
            </div>
          </div>
        </aside>
      ) : null}
    </>
  );
}
