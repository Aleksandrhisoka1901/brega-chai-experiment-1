"use client";

import { useEffect } from "react";

import { SystemState } from "@/components/system-state";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route rendering failed", { digest: error.digest });
  }, [error.digest]);

  return (
    <>
      <meta content="noindex, nofollow" name="robots" />
      <SystemState
        eyebrow="Ошибка 500"
        title="Что-то пошло не так"
        description="Попробуйте повторить запрос. Если ошибка сохранится, вернитесь немного позже."
        action={
          <button className="text-link" onClick={reset} type="button">
            Попробовать снова
          </button>
        }
      />
    </>
  );
}
