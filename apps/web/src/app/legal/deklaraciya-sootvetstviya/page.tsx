import type { Metadata } from "next";
import Link from "next/link";

import { BRAND_EMAIL, BRAND_NAME } from "@/lib/brand";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: `Декларация соответствия — ${BRAND_NAME}`,
  description:
    "Декларация соответствия на портативные электростанции и солнечные панели. Актуальный документ предоставляется по запросу.",
  path: "/legal/deklaraciya-sootvetstviya",
});

export default function ConformityDeclarationPage() {
  return (
    <main className="legal-page content-frame" data-content-frame>
      <p className="eyebrow">Правовая информация</p>
      <h1>Декларация соответствия</h1>
      <p>
        Поставляемое оборудование сопровождается декларацией соответствия
        требованиям технических регламентов, применимым к портативным
        электростанциям и солнечным панелям.
      </p>
      <p>
        Актуальный скан декларации направляется по запросу на{" "}
        <a href={`mailto:${BRAND_EMAIL}`}>{BRAND_EMAIL}</a> или при оформлении
        заказа. После регистрации электронной копии документ будет опубликован
        на этой странице.
      </p>
      <p>
        <Link href="/">Вернуться на главную</Link>
      </p>
    </main>
  );
}
