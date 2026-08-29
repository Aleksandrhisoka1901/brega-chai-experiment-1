import type { Metadata } from "next";

import { SystemState } from "@/components/system-state";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Страница не найдена — ${BRAND_NAME}`,
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
