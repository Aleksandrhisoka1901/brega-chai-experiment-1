import type { CSSProperties } from "react";

import type { ArticleCardsGrid, ArticleGridCard } from "@/server/cms/article-mapper";

import { ResponsiveImage } from "../../responsive-image";
import { SafeHtml } from "../../safe-html";
import styles from "./cards-grid.module.css";

function optionalColor(
  name: string,
  value?: string,
): CSSProperties | undefined {
  return value ? ({ [name]: value } as CSSProperties) : undefined;
}

function hasMarkup(value: string) {
  return /<[a-z][\s\S]*>/i.test(value);
}

function GridCard({ card }: { card: ArticleGridCard }) {
  const Heading = card.titleHtmlTag;
  const hasBullet = Boolean(card.bulletText || card.bulletIcon);
  const media = card.image ? (
    <div
      className={styles.cardMedia}
      data-align={card.imageAlign}
      style={{
        ["--image-scale" as string]: `${card.imageScalePercent / 100}`,
      }}
    >
      <ResponsiveImage
        alt={card.image.alt}
        height={card.image.height ?? 720}
        sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
        sources={card.image.sources}
        src={card.image.url}
        style={{ objectFit: card.imageFit }}
        width={card.image.width ?? 960}
      />
    </div>
  ) : null;
  const bullet = hasBullet ? (
    <div
      className={styles.bullet}
      data-align={card.bulletAlign}
      data-disabled-bg={card.bulletDisabledBg || undefined}
      data-disabled-paddings={card.bulletDisabledPaddings || undefined}
      style={{
        ...optionalColor("--bullet-bg", card.bulletBgColor),
        ...optionalColor("--bullet-color", card.bulletTextColor),
        ["--bullet-scale" as string]: `${card.bulletScalePercent / 100}`,
      }}
    >
      {card.bulletIcon ? (
        <ResponsiveImage
          alt=""
          height={card.bulletIcon.height ?? 48}
          sizes="48px"
          sources={card.bulletIcon.sources}
          src={card.bulletIcon.url}
          width={card.bulletIcon.width ?? 48}
        />
      ) : null}
      {card.bulletText ? <span>{card.bulletText}</span> : null}
    </div>
  ) : null;
  const title = card.title ? (
    hasMarkup(card.title) ? (
      <SafeHtml className={styles.cardTitle} html={card.title} />
    ) : (
      <Heading className={styles.cardTitle}>{card.title}</Heading>
    )
  ) : null;

  return (
    <article
      className={styles.card}
      data-disabled-bg={card.disabledBg || undefined}
      data-disabled-paddings={card.disabledPaddings || undefined}
      data-image-position={card.imagePosition}
      style={{
        ...optionalColor("--card-bg", card.bgColor),
        ...optionalColor("--card-border", card.borderColor),
        ...optionalColor("--card-title", card.titleColor),
        ...optionalColor("--card-copy", card.descriptionColor),
        ...optionalColor("--card-links", card.descriptionLinksColor),
        gridColumn: `${card.gridColumnsStart} / span ${card.gridColumnsSpan}`,
        gridRow: `${card.gridRowsStart} / span ${card.gridRowsSpan}`,
      }}
    >
      {card.imagePosition === "top" ? media : null}
      {card.imagePosition === "left" ? media : null}
      <div className={styles.cardBody} data-bullet-position={card.bulletPosition}>
        {card.bulletPosition === "top" || card.bulletPosition === "left"
          ? bullet
          : null}
        <div className={styles.cardCopy}>
          {title}
          {card.description ? (
            <SafeHtml className={styles.cardDescription} html={card.description} />
          ) : null}
        </div>
        {card.bulletPosition === "bottom" || card.bulletPosition === "right"
          ? bullet
          : null}
      </div>
      {card.imagePosition === "right" ? media : null}
      {card.imagePosition === "bottom" ? media : null}
    </article>
  );
}

export function CardsGrid({ block }: { block: ArticleCardsGrid }) {
  const titleStyle = optionalColor("--block-title", block.titleColor);
  const title = block.title ? (
    hasMarkup(block.title) ? (
      <SafeHtml className={styles.title} html={block.title} style={titleStyle} />
    ) : (
      <h2 className={styles.title} style={titleStyle}>
        {block.title}
      </h2>
    )
  ) : null;

  return (
    <section
      className={styles.block}
      style={{
        ["--grid-columns" as string]: String(block.gridColumns),
      }}
    >
      {title}
      {block.description ? (
        <SafeHtml className={styles.description} html={block.description} />
      ) : null}
      {block.cards.length > 0 ? (
        <div className={styles.grid}>
          {block.cards.map((card, index) => (
            <GridCard card={card} key={`${card.title ?? "card"}-${index}`} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
