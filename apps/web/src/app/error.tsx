"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="holding-page">
      <meta content="noindex, nofollow" name="robots" />
      <div role="alert">
        <p className="eyebrow">Сервис временно недоступен</p>
        <h1>Не удалось открыть страницу</h1>
        <p>Попробуйте повторить запрос немного позже.</p>
        <button className="text-link" onClick={reset} type="button">
          Попробовать снова
        </button>
      </div>
    </main>
  );
}
