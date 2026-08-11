import type { ReactNode } from "react";

import { ResponsiveImage } from "@/components/responsive-image";
import {
  bindShortRussianWords,
  bindTrailingShortRussianWord,
} from "@/lib/typography";

import type { RichContentBlock, RichInline, RichText } from "./model";

function renderText(
  node: RichText,
  key: number,
  hasFollowingInline: boolean,
): ReactNode {
  let content: ReactNode = node.code
    ? node.text
    : bindShortRussianWords(node.text);
  if (!node.code && hasFollowingInline) {
    content = bindTrailingShortRussianWord(String(content));
  }
  if (node.code) content = <code>{content}</code>;
  if (node.bold) content = <strong>{content}</strong>;
  if (node.italic) content = <em>{content}</em>;
  if (node.underline) content = <u>{content}</u>;
  if (node.strikethrough) content = <s>{content}</s>;
  return <span key={key}>{content}</span>;
}

function renderInlines(nodes: RichInline[]): ReactNode[] {
  return nodes.map((node, index) => {
    if (node.type === "text") {
      return renderText(node, index, index < nodes.length - 1);
    }

    return (
      <a
        href={node.href}
        key={index}
        {...(node.external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {renderInlines(node.children)}
      </a>
    );
  });
}

function renderBlock(block: RichContentBlock, key: number): ReactNode {
  switch (block.type) {
    case "paragraph":
      return <p key={key}>{renderInlines(block.children)}</p>;
    case "heading": {
      const Heading = `h${block.level}` as "h2" | "h3" | "h4";
      return <Heading key={key}>{renderInlines(block.children)}</Heading>;
    }
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List key={key}>
          {block.children.map((item, index) => (
            <li key={index}>{renderInlines(item.children)}</li>
          ))}
        </List>
      );
    }
    case "quote":
      return (
        <blockquote key={key}>
          <p>{renderInlines(block.children)}</p>
        </blockquote>
      );
    case "image":
      return (
        <figure data-align={block.align} key={key}>
          <ResponsiveImage
            alt={block.alt}
            height={block.height}
            sizes="(max-width: 767px) 100vw, 72vw"
            sources={block.sources}
            src={block.url}
            width={block.width}
          />
          {block.caption ? (
            <figcaption>{bindShortRussianWords(block.caption)}</figcaption>
          ) : null}
        </figure>
      );
    case "table":
      return (
        <div
          aria-label="Таблица в статье"
          data-rich-table-scroll
          key={key}
          role="region"
          tabIndex={0}
        >
          <table>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.cells.map((cell, cellIndex) => {
                    const Cell = cell.header ? "th" : "td";
                    return (
                      <Cell
                        key={cellIndex}
                        {...(cell.header ? { scope: "col" as const } : {})}
                      >
                        {renderInlines(cell.children)}
                      </Cell>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "divider":
      return <hr key={key} />;
  }
}

export function RichContent({ content }: { content: RichContentBlock[] }) {
  if (content.length === 0) return null;
  return <>{content.map(renderBlock)}</>;
}
