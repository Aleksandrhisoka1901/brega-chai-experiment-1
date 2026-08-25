import type { CSSProperties, ReactNode } from "react";

import { parseSafeHtml, type SafeHtmlNode } from "@/lib/html/safe-html";

function renderNode(node: SafeHtmlNode, key: number): ReactNode {
  if (node.type === "text") return node.value;

  const children = node.children.map((child, index) =>
    renderNode(child, index),
  );

  switch (node.tag) {
    case "br":
      return <br key={key} />;
    case "p":
      return <p key={key}>{children}</p>;
    case "strong":
    case "b":
      return <strong key={key}>{children}</strong>;
    case "em":
    case "i":
      return <em key={key}>{children}</em>;
    case "u":
      return <u key={key}>{children}</u>;
    case "ul":
      return <ul key={key}>{children}</ul>;
    case "ol":
      return <ol key={key}>{children}</ol>;
    case "li":
      return <li key={key}>{children}</li>;
    case "h2":
      return <h2 key={key}>{children}</h2>;
    case "h3":
      return <h3 key={key}>{children}</h3>;
    case "h4":
      return <h4 key={key}>{children}</h4>;
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "a":
      return (
        <a
          href={node.href}
          key={key}
          {...(node.external
            ? { rel: "noopener noreferrer", target: "_blank" }
            : {})}
        >
          {children}
        </a>
      );
    default:
      return children;
  }
}

export function SafeHtml({
  className,
  html,
  style,
}: {
  className?: string;
  html: string;
  style?: CSSProperties;
}) {
  const nodes = parseSafeHtml(html);
  if (nodes.length === 0) return null;

  return (
    <div className={className} style={style}>
      {nodes.map((node, index) => renderNode(node, index))}
    </div>
  );
}
