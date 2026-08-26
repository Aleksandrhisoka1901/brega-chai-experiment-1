const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "a",
]);
const VOID_TAGS = new Set(["br"]);
const TOKEN = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)\/?>|([^<]+)/g;

export type SafeHtmlNode =
  | { type: "text"; value: string }
  | {
      type: "element";
      tag: string;
      href?: string;
      external?: boolean;
      children: SafeHtmlNode[];
    };

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, "\u00a0")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

function readAttribute(attributes: string, name: string) {
  const match = attributes.match(
    new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

export function normalizeHref(value: string): string | undefined {
  const href = value.trim();
  if (!href) return undefined;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (href.startsWith("#")) return href;
  if (href.startsWith("mailto:")) {
    return /^mailto:[^@\s]+@[^@\s]+$/.test(href) ? href : undefined;
  }

  try {
    const url = new URL(href);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function isExternalHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

export function parseSafeHtml(html: string): SafeHtmlNode[] {
  const root: SafeHtmlNode[] = [];
  const stack: Array<{ tag: string; children: SafeHtmlNode[] }> = [
    { tag: "root", children: root },
  ];
  TOKEN.lastIndex = 0;
  let ignoring: string | undefined;
  let match: RegExpExecArray | null;

  while ((match = TOKEN.exec(html))) {
    const tag = match[1]?.toLowerCase();
    const raw = match[0];
    const isClose = raw.startsWith("</");

    if (ignoring) {
      if (isClose && tag === ignoring) ignoring = undefined;
      continue;
    }

    const current = stack[stack.length - 1];
    if (!current) break;

    if (raw.startsWith("<!--")) continue;

    const text = match[3];
    if (text) {
      const value = decodeEntities(text);
      if (value) current.children.push({ type: "text", value });
      continue;
    }

    if (!tag || !ALLOWED_TAGS.has(tag)) {
      if (tag && !isClose && !VOID_TAGS.has(tag) && !/\/\s*>$/.test(raw)) {
        ignoring = tag;
      }
      continue;
    }
    const selfClosing = VOID_TAGS.has(tag) || /\/\s*>$/.test(raw);

    if (isClose) {
      if (stack.length > 1 && current.tag === tag) stack.pop();
      continue;
    }

    const node: Extract<SafeHtmlNode, { type: "element" }> = {
      type: "element",
      tag,
      children: [],
    };

    if (tag === "a") {
      const href = normalizeHref(readAttribute(match[2] ?? "", "href") ?? "");
      if (!href) continue;
      node.href = href;
      node.external = isExternalHref(href);
    }

    current.children.push(node);
    if (!selfClosing) {
      stack.push({ tag, children: node.children });
    }
  }

  return root;
}

export function safeHtmlToText(html: string): string {
  const readNodes = (nodes: SafeHtmlNode[]): string =>
    nodes
      .map((node) =>
        node.type === "text" ? node.value : readNodes(node.children),
      )
      .join(" ");

  return readNodes(parseSafeHtml(html)).replace(/\s+/g, " ").trim();
}
