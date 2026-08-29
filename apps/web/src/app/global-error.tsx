"use client";

import { useEffect } from "react";

import { SystemState } from "@/components/system-state";

import "./styles.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root rendering failed", { digest: error.digest });
  }, [error.digest]);

  return (
    <html lang="ru">
      <head>
        <meta content="noindex, nofollow" name="robots" />
        <title>Сервис временно недоступен — Voltora</title>
      </head>
      <body>
        <SystemState
          eyebrow="Ошибка 500"
          title="Что-то пошло не так"
          description="Попробуйте обновить страницу. Если ошибка сохранится, вернитесь немного позже."
          action={
            <button onClick={reset} type="button">
              Попробовать снова
            </button>
          }
        />
      </body>
    </html>
  );
}
