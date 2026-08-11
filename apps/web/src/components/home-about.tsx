import type { HomePageContent } from "@/server/cms/home-mapper";
import { bindShortRussianWords } from "@/lib/typography";

import styles from "./home.module.css";

export function HomeAbout({ about }: { about: HomePageContent["about"] }) {
  return (
    <section
      className={styles.about}
      data-spacing={about.spacing}
      id="about"
      style={{
        backgroundColor: about.backgroundColor,
        color: about.textColor,
      }}
    >
      <div className={styles.aboutTitle}>
        <p className={styles.chapter}>{bindShortRussianWords(about.eyebrow)}</p>
        <h2>{bindShortRussianWords(about.title)}</h2>
      </div>
      <div className={styles.aboutCopy}>
        {about.textBlocks.map((paragraph) => (
          <p key={paragraph}>{bindShortRussianWords(paragraph)}</p>
        ))}
      </div>
    </section>
  );
}
