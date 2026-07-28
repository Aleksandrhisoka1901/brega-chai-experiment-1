import Image from "next/image";
import Link from "next/link";

import type { HomePageContent } from "@/server/cms/home-mapper";

import styles from "./home.module.css";

export function HomeHero({ hero }: { hero: HomePageContent["hero"] }) {
  return (
    <section
      className={styles.hero}
      data-layout={hero.layout}
      style={{
        backgroundColor: hero.backgroundColor,
        color: hero.textColor,
      }}
    >
      <div className={styles.heroCopy}>
        <p className={styles.chapter}>Brega Chai · Чайное издание</p>
        <h1>{hero.title}</h1>
        <p>{hero.text}</p>
        {hero.cta ? <Link href={hero.cta.url}>{hero.cta.label}</Link> : null}
      </div>
      {hero.image ? (
        <div className={styles.heroMedia}>
          <Image
            alt={hero.image.alt}
            fill
            priority
            sizes="(max-width: 767px) 100vw, 60vw"
            src={hero.image.url}
            unoptimized
          />
        </div>
      ) : null}
    </section>
  );
}
