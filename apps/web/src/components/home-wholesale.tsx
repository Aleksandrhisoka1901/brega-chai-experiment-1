import { WHOLESALE_PATH } from "@/lib/storefront-routes";
import { bindShortRussianWords } from "@/lib/typography";

import { EditorialLink } from "./editorial-link";
import styles from "./home.module.css";

const points = [
  "Магазины и маркетплейсы",
  "Монтаж и сервис",
  "Дистрибуция по России",
] as const;

export function HomeWholesale() {
  return (
    <section className={styles.wholesale} id="opt">
      <div
        className={`${styles.wholesaleInner} content-frame`}
        data-content-frame
      >
        <div className={styles.wholesaleTitle}>
          <p className={styles.chapter}>
            {bindShortRussianWords("Партнёрам")}
          </p>
          <h2>{bindShortRussianWords("Для оптовиков")}</h2>
        </div>
        <div className={styles.wholesaleCopy}>
          <p>
            {bindShortRussianWords(
              "Партии станций и панелей для тех, кто продаёт, ставит и обслуживает автономный резерв. Подберём линейку, сроки и комплектацию под ваш канал — без розничной витрины.",
            )}
          </p>
          <ul>
            {points.map((point) => (
              <li key={point}>{bindShortRussianWords(point)}</li>
            ))}
          </ul>
          <EditorialLink href={WHOLESALE_PATH} label="Условия для опта" />
        </div>
      </div>
    </section>
  );
}
