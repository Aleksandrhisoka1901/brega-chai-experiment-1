import type { HomePageContent } from "@/server/cms/home-mapper";
import { bindShortRussianWords } from "@/lib/typography";

import styles from "./home.module.css";

function AboutParagraph({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);

  return (
    <p>
      {parts.map((part, index) => {
        const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (!match) return bindShortRussianWords(part);

        return (
          <a href={match[2]} key={`${match[2]}-${index}`}>
            {bindShortRussianWords(match[1])}
          </a>
        );
      })}
    </p>
  );
}

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
      <div className={`${styles.aboutInner} content-frame`} data-content-frame>
        <div className={styles.aboutTitle}>
          {about.eyebrow ? (
            <p className={styles.chapter}>
              {bindShortRussianWords(about.eyebrow)}
            </p>
          ) : null}
          <h2>{bindShortRussianWords(about.title)}</h2>
        </div>
        <div className={styles.aboutCopy}>
          {about.textBlocks.map((paragraph) => (
            <AboutParagraph key={paragraph} text={paragraph} />
          ))}
        </div>
      </div>
    </section>
  );
}
