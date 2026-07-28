"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="ru">
      <head>
        <meta content="noindex, nofollow" name="robots" />
        <title>Сервис временно недоступен — Brega Chai</title>
      </head>
      <body>
        <main>
          <div role="alert">
            <h1>Сервис временно недоступен</h1>
            <button onClick={reset} type="button">
              Попробовать снова
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
