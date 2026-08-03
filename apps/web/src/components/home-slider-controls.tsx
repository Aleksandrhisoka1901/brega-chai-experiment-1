"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";

import styles from "./home.module.css";

export function HomeSliderControls({
  atEnd,
  atStart,
  onNext,
  onPrevious,
  subject,
}: {
  atEnd: boolean;
  atStart: boolean;
  onNext: () => void;
  onPrevious: () => void;
  subject: string;
}) {
  return (
    <div className={styles.controls}>
      <div>
        <button
          aria-label={`Предыдущие ${subject}`}
          disabled={atStart}
          onClick={onPrevious}
          type="button"
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <button
          aria-label={`Следующие ${subject}`}
          disabled={atEnd}
          onClick={onNext}
          type="button"
        >
          <ArrowRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
