"use client";

import { useState } from "react";

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
  const selected = CAPABILITY_COLUMNS.find((column) => column.id === selectedId);

  return (
    <>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption>
            {bindShortRussianWords("Сравнительная таблица аккумуляторных систем")}
          </caption>
          <thead>
            <tr>
              <th scope="col">Характеристика</th>
              {CAPABILITY_COLUMNS.map((column) => {
                const selected = column.id === selectedId;
                return (
                  <th
                    className={`${styles.model}${selected ? ` ${styles.selected}` : ""}`}
                    key={column.id}
                    scope="col"
                  >
                    <button
                      className={styles.modelButton}
                      type="button"
                      onClick={() => {
                        setSelectedId(column.id);
                        document
                          .getElementById("inquiry")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
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
                  const selected = column?.id === selectedId;
                  return (
                    <td
                      className={selected ? styles.selected : undefined}
                      key={`${row.label}-${column?.id ?? index}`}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <InquiryForm
        defaultModel={selected?.name}
        models={CAPABILITY_COLUMNS.map((column) => ({
          id: column.id,
          name: column.name,
        }))}
        source={CAPABILITY_PATH}
      />
    </>
  );
}
