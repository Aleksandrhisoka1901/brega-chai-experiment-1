import Link from "next/link";
import type { ReactNode } from "react";

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
    <main className="holding-page">
      <div
        aria-describedby="system-state-description"
        aria-labelledby="system-state-title"
        className="holding-page__content"
      >
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="system-state-title">{title}</h1>
        <p id="system-state-description">{description}</p>
        {action ?? (
          <Link className="text-link" href="/">
            Вернуться на главную
          </Link>
        )}
      </div>
    </main>
  );
}
