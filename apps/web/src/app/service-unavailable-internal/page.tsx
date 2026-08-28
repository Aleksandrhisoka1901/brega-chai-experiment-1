import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { SystemState } from "@/components/system-state";

export const metadata: Metadata = {
  title: "Сервис временно недоступен — Brega",
  robots: { index: false, follow: false },
};

export default async function ServiceUnavailablePage() {
  const requestHeaders = await headers();
  if (requestHeaders.get("x-brega-service-unavailable") !== "1") notFound();

  return (
    <SystemState
      eyebrow="Ошибка 503"
      title="Сайт ненадолго остановился"
      description="Мы уже знаем о проблеме. Попробуйте обновить страницу через несколько минут."
    />
  );
}
