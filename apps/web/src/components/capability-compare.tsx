"use client";

import { useEffect, useRef, useState } from "react";

import { InquiryForm } from "@/features/inquiry/inquiry-form";
import { CAPABILITY_PATH } from "@/lib/storefront-routes";
import { bindShortRussianWords } from "@/lib/typography";
import type {
  CapabilityColumn,
  CapabilityRow,
} from "@/server/capability-models";

import styles from "./capability-page.module.css";

export function CapabilityCompare({
  models,
  rows,
  tableTitle,
}: {
  models: readonly CapabilityColumn[];
  rows: readonly CapabilityRow[];
  tableTitle: string;
}) {
  const [selectedId, setSelectedId] = useState(models[0]?.id ?? "");
  const [formOpen, setFormOpen] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const selected =
    models.find((column) => column.id === selectedId) ?? models[0];
  const activeIndex = Math.max(
    0,
    models.findIndex((column) => column.id === selected?.id),
  );

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

  if (!selected) return null;

  const chooseModel = (id: string) => {
    setSelectedId(id);
  };

  return (
    <>
      <div className={styles.models}>
        {models.map((column) => {
          const isSelected = column.id === selected.id;
          return (
            <button
              aria-pressed={isSelected}
              className={styles.modelCard}
              data-selected={isSelected}
              key={column.id}
              type="button"
              onClick={() => chooseModel(column.id)}
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
                <span>{column.description}</span>
                <small>{column.productModel}</small>
                <em className={styles.chosen} data-hidden={!isSelected}>
                  Выбрано
                </em>
              </span>
            </button>
          );
        })}
      </div>
      <section className={styles.mobileSpecs} aria-label="Характеристики">
        <div className={styles.chips}>
          {models.map((column) => (
            <button
              aria-pressed={column.id === selected.id}
              className={styles.chip}
              data-selected={column.id === selected.id}
              key={column.id}
              type="button"
              onClick={() => chooseModel(column.id)}
            >
              {column.name}
            </button>
          ))}
        </div>
        <dl className={styles.specList}>
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{bindShortRussianWords(row.label)}</dt>
              <dd>{row.values[activeIndex]}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className={styles.tableBlock} aria-labelledby="capability-table-title">
        <h2 className={styles.tableTitle} id="capability-table-title">
          {bindShortRussianWords(tableTitle)}
        </h2>
        <div className={styles.scroll} ref={tableScrollRef}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Характеристика</th>
              {models.map((column) => {
                const isSelected = column.id === selected.id;
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
            {rows.map((row) => (
              <tr key={row.label}>
                <th className={styles.rowLabel} scope="row">
                  {bindShortRussianWords(row.label)}
                </th>
                {row.values.map((value, index) => {
                  const column = models[index];
                  const isSelected = column?.id === selected.id;
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
      </section>
      <InquiryForm
        collapsedByDefault
        defaultModel={selected.name}
        expanded={formOpen}
        models={models.map((column) => ({
          id: column.id,
          name: column.name,
        }))}
        source={CAPABILITY_PATH}
        onExpandedChange={setFormOpen}
        onModelChange={(name) => {
          const match = models.find((column) => column.name === name);
          if (match) setSelectedId(match.id);
        }}
      />
    </>
  );
}
