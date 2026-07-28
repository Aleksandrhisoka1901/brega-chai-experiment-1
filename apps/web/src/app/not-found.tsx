import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Страница не найдена — Brega Chai",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="holding-page">
      <p className="eyebrow">Ошибка 404</p>
      <h1>Такой страницы нет</h1>
      <p>Возможно, ссылка устарела или в адресе есть ошибка.</p>
      <Link className="text-link" href="/">
        Вернуться на главную
      </Link>
    </main>
  );
}
