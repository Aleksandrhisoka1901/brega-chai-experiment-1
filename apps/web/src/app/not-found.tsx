import type { Metadata } from "next";

import { SystemState } from "@/components/system-state";
export const metadata: Metadata = {
  title: "Страница не найдена — Brega",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <SystemState
      eyebrow="Ошибка 404"
      title="Такой страницы нет"
      description="Возможно, ссылка устарела или в адресе есть ошибка."
    />
  );
}
