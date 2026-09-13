"use client";

import { useEffect, useRef, useState } from "react";

import { InquiryForm } from "@/features/inquiry/inquiry-form";
import { CAPABILITY_PATH } from "@/lib/storefront-routes";
import { bindShortRussianWords } from "@/lib/typography";
import {
  CAPABILITY_COLUMNS,
  CAPABILITY_ROWS,
} from "@/server/capability-models";

import styles from "./capability-page.module.css";

export function CapabilityCompare() {
  const [selectedId, setSelectedId] = useState<string>();
  const [formOpen, setFormOpen] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const selected = CAPABILITY_COLUMNS.find((column) => column.id === selectedId);

  useEffect(() => {
    if (!selectedId) return;
    const scroller = tableScrollRef.current;
    const cell = scroller?.querySelector<HTMLElement>(
      `[data-model-col="${selectedId}"]`,
    );
    if (!scroller || !cell) return;
    const sticky = scroller.querySelector<HTMLElement>(`.${styles.rowLabel}`);
    const offset = (sticky?.getBoundingClientRect().width ?? 0) + 16;
    const nextLeft =
      scroller.scrollLeft +
      cell.getBoundingClientRect().left -
      scroller.getBoundingClientRect().left -
      offset;
    scroller.scrollTo({ left: Math.max(0, nextLeft), behavior: "smooth" });
  }, [selectedId]);

  const chooseModel = (id: string, scrollToForm = false) => {
    setSelectedId(id);
    setFormOpen(true);
    if (!scrollToForm) return;
    window.requestAnimationFrame(() => {
      document
        .getElementById("inquiry")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <>
      <div className={styles.models}>
        {CAPABILITY_COLUMNS.map((column) => {
          const isSelected = column.id === selectedId;
          return (
            <button
              aria-pressed={isSelected}
              className={styles.modelCard}
              data-selected={isSelected}
              key={column.id}
              type="button"
              onClick={() => chooseModel(column.id, true)}
            >
              <img
                alt={column.name}
                className={styles.modelPhoto}
                height={480}
                src={column.image}
                width={640}
              />
              <span className={styles.modelBody}>
                <strong>{column.name}</strong>
                <span>
                  {column.capacity}
                  {column.power ? ` · ${column.power}` : ""}
                </span>
                <small>{column.productModel}</small>
                {isSelected ? (
                  <em className={styles.chosen}>Выбрано</em>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className={styles.scroll} ref={tableScrollRef}>
        <table className={styles.table}>
          <caption>
            {bindShortRussianWords(
              "Сравнительная таблица аккумуляторных систем",
            )}
          </caption>
          <thead>
            <tr>
              <th scope="col">Характеристика</th>
              {CAPABILITY_COLUMNS.map((column) => {
                const isSelected = column.id === selectedId;
                return (
                  <th
                    className={`${styles.model}${isSelected ? ` ${styles.selected}` : ""}`}
                    data-model-col={column.id}
                    key={column.id}
                    scope="col"
                  >
                    <button
                      className={styles.modelButton}
                      type="button"
                      onClick={() => chooseModel(column.id)}
                    >
                      <span className={styles.modelName}>{column.name}</span>
                      <span className={styles.modelCode}>
                        {column.productModel}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {CAPABILITY_ROWS.map((row) => (
              <tr key={row.label}>
                <th className={styles.rowLabel} scope="row">
                  {bindShortRussianWords(row.label)}
                </th>
                {row.values.map((value, index) => {
                  const column = CAPABILITY_COLUMNS[index];
                  const isSelected = column?.id === selectedId;
                  return (
                    <td
                      className={isSelected ? styles.selected : undefined}
                      key={`${row.label}-${column?.id ?? index}`}
                    >
                      <button
                        className={styles.cellButton}
                        type="button"
                        onClick={() => {
                          if (column) chooseModel(column.id);
                        }}
                      >
                        {value}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <InquiryForm
        collapsedByDefault
        defaultModel={selected?.name ?? ""}
        expanded={formOpen}
        models={CAPABILITY_COLUMNS.map((column) => ({
          id: column.id,
          name: column.name,
        }))}
        source={CAPABILITY_PATH}
        onExpandedChange={setFormOpen}
        onModelChange={(name) => {
          const match = CAPABILITY_COLUMNS.find((column) => column.name === name);
          setSelectedId(match?.id);
        }}
      />
    </>
  );
}
