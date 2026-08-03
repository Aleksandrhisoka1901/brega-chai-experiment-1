import Link from "next/link";

import { bindShortRussianWords } from "@/lib/typography";

export type BreadcrumbItem = {
  href: string;
  name: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Хлебные крошки" className="breadcrumbs">
      <ol>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li key={`${item.href}-${item.name}`}>
              {isCurrent ? (
                <span aria-current="page">
                  {bindShortRussianWords(item.name)}
                </span>
              ) : (
                <Link href={item.href}>{bindShortRussianWords(item.name)}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
