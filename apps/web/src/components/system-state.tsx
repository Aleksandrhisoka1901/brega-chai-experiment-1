import Link from "next/link";
import type { ReactNode } from "react";

import { bindShortRussianWords } from "@/lib/typography";

type SystemStateProps = {
  action?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
};

export function SystemState({
  action,
  description,
  eyebrow,
  title,
}: SystemStateProps) {
  return (
    <main className="holding-page content-frame" data-content-frame>
      <div
        aria-describedby="system-state-description"
        aria-labelledby="system-state-title"
        className="holding-page__content"
      >
        <p className="eyebrow">{bindShortRussianWords(eyebrow)}</p>
        <h1 id="system-state-title">{bindShortRussianWords(title)}</h1>
        <p id="system-state-description">
          {bindShortRussianWords(description)}
        </p>
        {action ?? (
          <Link className="text-link" href="/">
            {bindShortRussianWords("Вернуться на главную")}
          </Link>
        )}
      </div>
    </main>
  );
}
