import Image from "next/image";

import type { HomePageContent } from "@/server/cms/home-mapper";

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
      <span aria-hidden="true">01</span>
      <div>
        <p className={styles.chapter}>Глава I · О проекте</p>
        <h2>{about.paragraphs[0]}</h2>
      </div>
      <div className={styles.aboutCopy}>
        {about.paragraphs.slice(1).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {about.image ? (
        <Image
          alt={about.image.alt}
          height={about.image.height}
          src={about.image.url}
          unoptimized
          width={about.image.width}
        />
      ) : null}
    </section>
  );
}
