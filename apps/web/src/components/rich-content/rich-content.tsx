import Image from "next/image";
import type { ReactNode } from "react";

import type { RichContentBlock, RichInline, RichText } from "./model";

function renderText(node: RichText, key: number): ReactNode {
  let content: ReactNode = node.text;
  if (node.code) content = <code>{content}</code>;
  if (node.bold) content = <strong>{content}</strong>;
  if (node.italic) content = <em>{content}</em>;
  if (node.underline) content = <u>{content}</u>;
  if (node.strikethrough) content = <s>{content}</s>;
  return <span key={key}>{content}</span>;
}

function renderInlines(nodes: RichInline[]): ReactNode[] {
  return nodes.map((node, index) => {
    if (node.type === "text") return renderText(node, index);

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
        <figure key={key}>
          <Image
            alt={block.alt}
            height={block.height}
            src={block.url}
            unoptimized
            width={block.width}
          />
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      );
    case "divider":
      return <hr key={key} />;
  }
}

export function RichContent({ content }: { content: RichContentBlock[] }) {
  if (content.length === 0) return null;
  return <>{content.map(renderBlock)}</>;
}
