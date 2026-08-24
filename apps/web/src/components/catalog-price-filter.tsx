"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { catalogPageHref } from "./catalog-pagination-model";
import { parseCatalogPriceInput } from "./catalog-price-filter-model";
import styles from "./catalog-price-filter.module.css";

export function CatalogPriceFilter({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const minId = useId();
  const maxId = useId();
  const errorId = useId();
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMinPrice(searchParams.get("minPrice") ?? "");
    setMaxPrice(searchParams.get("maxPrice") ?? "");
    setError(null);
  }, [searchParams]);

  const apply = () => {
    const min = parseCatalogPriceInput(minPrice);
    const max = parseCatalogPriceInput(maxPrice);

    if (min === null || max === null) {
      setError("Укажите целые положительные числа.");
      return;
    }
    if (min != null && max != null && min > max) {
      setError("Цена «от» не может быть больше цены «до».");
      return;
    }

    setError(null);
    router.push(
      catalogPageHref(basePath, 1, {
        ...(min === undefined ? {} : { minPrice: min }),
        ...(max === undefined ? {} : { maxPrice: max }),
      }),
    );
  };

  return (
    <form
      aria-label="Фильтр по цене"
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
    >
      <div className={styles.fields}>
        <label className={styles.field} htmlFor={minId}>
          <span>Цена от</span>
          <input
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            id={minId}
            inputMode="numeric"
            name="minPrice"
            onChange={(event) => setMinPrice(event.target.value)}
            value={minPrice}
          />
        </label>
        <label className={styles.field} htmlFor={maxId}>
          <span>Цена до</span>
          <input
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            id={maxId}
            inputMode="numeric"
            name="maxPrice"
            onChange={(event) => setMaxPrice(event.target.value)}
            value={maxPrice}
          />
        </label>
      </div>
      <div className={styles.actions}>
        <button className={styles.apply} type="submit">
          Применить
        </button>
        <button
          className={styles.reset}
          onClick={() => {
            setMinPrice("");
            setMaxPrice("");
            setError(null);
            router.push(basePath);
          }}
          type="button"
        >
          Сбросить
        </button>
      </div>
      {error ? (
        <p className={styles.error} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
