"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";

import styles from "./home.module.css";

export function HomeSliderControls({
  atEnd,
  atStart,
  onNext,
  onPrevious,
  prominent = false,
  subject,
}: {
  atEnd: boolean;
  atStart: boolean;
  onNext: () => void;
  onPrevious: () => void;
  prominent?: boolean;
  subject: string;
}) {
  return (
    <div
      className={`${styles.controls} ${prominent ? styles.controlsProminent : ""}`}
    >
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
