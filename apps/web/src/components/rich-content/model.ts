type RecordValue = Record<string, unknown>;

export type RichText = {
  type: "text";
  text: string;
  bold?: true;
  italic?: true;
  underline?: true;
  strikethrough?: true;
  code?: true;
};

export type RichLink = {
  type: "link";
  href: string;
  external: boolean;
  children: RichInline[];
};

export type RichInline = RichText | RichLink;

export type RichContentBlock =
  | { type: "paragraph"; children: RichInline[] }
  | {
      type: "heading";
      level: 2 | 3 | 4;
      children: RichInline[];
    }
  | {
      type: "list";
      ordered: boolean;
      children: Array<{ type: "list-item"; children: RichInline[] }>;
    }
  | { type: "quote"; children: RichInline[] }
  | {
      type: "image";
      url: string;
      alt: string;
      caption?: string;
      align: "left" | "center" | "right";
      width: number;
      height: number;
      sources: Array<{ url: string; width: number }>;
    }
  | {
      type: "table";
      rows: Array<{
        cells: Array<{
          header: boolean;
          children: RichInline[];
        }>;
      }>;
    }
  | { type: "divider" };

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalMark(value: unknown): true | undefined {
  return value === true ? true : undefined;
}

function normalizeText(node: RecordValue): RichText | null {
  if (node.type !== "text" || typeof node.text !== "string") return null;

  return {
    type: "text",
    text: node.text,
    ...(optionalMark(node.bold) ? { bold: true as const } : {}),
    ...(optionalMark(node.italic) ? { italic: true as const } : {}),
    ...(optionalMark(node.underline) ? { underline: true as const } : {}),
    ...(optionalMark(node.strikethrough)
      ? { strikethrough: true as const }
      : {}),
    ...(optionalMark(node.code) ? { code: true as const } : {}),
  };
}

function normalizeLink(
  value: string,
): { href: string; external: boolean } | null {
  const href = value.trim();
  if (!href) return null;

  if (href.startsWith("/") || href.startsWith("#") || href.startsWith("?")) {
    return { href, external: false };
  }

  try {
    const url = new URL(href);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return { href: url.toString(), external: true };
    }
    if (url.protocol === "mailto:" || url.protocol === "tel:") {
      return { href: url.toString(), external: false };
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeInline(value: unknown): RichInline | null {
  if (!isRecord(value)) return null;

  const text = normalizeText(value);
  if (text) return text;

  if (value.type !== "link" || !Array.isArray(value.children)) return null;
  const children = normalizeInlines(value.children);
  if (!hasVisibleText(children)) return null;

  const link = typeof value.url === "string" ? normalizeLink(value.url) : null;
  if (!link) return collapseToText(children);

  return { type: "link", ...link, children };
}

function normalizeInlines(values: unknown[]): RichInline[] {
  return values.flatMap((value) => {
    const inline = normalizeInline(value);
    return inline ? [inline] : [];
  });
}

function collapseToText(inlines: RichInline[]): RichText {
  return {
    type: "text",
    text: inlines
      .map((inline) =>
        inline.type === "text"
          ? inline.text
          : collapseToText(inline.children).text,
      )
      .join(""),
  };
}

function hasVisibleText(inlines: RichInline[]): boolean {
  return inlines.some((inline) =>
    inline.type === "text"
      ? inline.text.trim().length > 0
      : hasVisibleText(inline.children),
  );
}

function normalizeContainer(value: RecordValue): RichInline[] | null {
  if (!Array.isArray(value.children)) return null;
  const children = normalizeInlines(value.children);
  return hasVisibleText(children) ? children : null;
}

function normalizeImageUrl(value: string, publicBase?: string): string | null {
  const path = value.trim();
  if (!path) return null;

  try {
    const url = publicBase ? new URL(path, publicBase) : new URL(path);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function normalizeImage(
  block: RecordValue,
  publicBase?: string,
): RichContentBlock | null {
  const media = isRecord(block.image)
    ? block.image
    : isRecord(block.media)
      ? block.media
      : null;
  if (!media) return null;

  const rawAlt =
    typeof media.alternativeText === "string"
      ? media.alternativeText
      : typeof media.alt === "string"
        ? media.alt
        : "";
  const alt = rawAlt.trim();
  const url =
    typeof media.url === "string"
      ? normalizeImageUrl(media.url, publicBase)
      : null;
  const width = media.width;
  const height = media.height;
  if (
    !alt ||
    !url ||
    typeof width !== "number" ||
    !Number.isInteger(width) ||
    width <= 0 ||
    typeof height !== "number" ||
    !Number.isInteger(height) ||
    height <= 0
  ) {
    return null;
  }

  const blockCaption =
    typeof block.caption === "string" && block.caption.trim()
      ? block.caption.trim()
      : undefined;
  const mediaCaption =
    typeof media.caption === "string" && media.caption.trim()
      ? media.caption.trim()
      : undefined;
  const caption = blockCaption ?? mediaCaption;
  const align =
    block.imageAlign === "left" ||
    block.imageAlign === "center" ||
    block.imageAlign === "right"
      ? block.imageAlign
      : "center";
  const sources = isRecord(media.formats)
    ? Object.values(media.formats).flatMap((format) => {
        if (
          !isRecord(format) ||
          typeof format.url !== "string" ||
          typeof format.width !== "number" ||
          !Number.isInteger(format.width) ||
          format.width <= 0
        ) {
          return [];
        }
        const sourceUrl = normalizeImageUrl(format.url, publicBase);
        return sourceUrl ? [{ url: sourceUrl, width: format.width }] : [];
      })
    : [];

  return {
    type: "image",
    url,
    alt,
    ...(caption ? { caption } : {}),
    align,
    width,
    height,
    sources,
  };
}

function normalizeTable(block: RecordValue): RichContentBlock | null {
  if (!Array.isArray(block.children)) return null;

  const rows = block.children.flatMap((row) => {
    if (
      !isRecord(row) ||
      row.type !== "table-row" ||
      !Array.isArray(row.children)
    ) {
      return [];
    }

    const cells = row.children.flatMap((cell) => {
      if (
        !isRecord(cell) ||
        (cell.type !== "table-cell" && cell.type !== "table-header-cell") ||
        !Array.isArray(cell.children)
      ) {
        return [];
      }

      return [
        {
          header: cell.type === "table-header-cell",
          children: normalizeInlines(cell.children),
        },
      ];
    });

    return cells.length > 0 ? [{ cells }] : [];
  });

  const hasContent = rows.some((row) =>
    row.cells.some((cell) => hasVisibleText(cell.children)),
  );
  return hasContent ? { type: "table", rows } : null;
}

function normalizeBlock(
  value: unknown,
  publicBase?: string,
): RichContentBlock | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;

  if (value.type === "paragraph") {
    const children = normalizeContainer(value);
    return children ? { type: "paragraph", children } : null;
  }

  if (value.type === "heading") {
    const children = normalizeContainer(value);
    if (!children || typeof value.level !== "number") return null;
    const level = value.level === 1 ? 2 : value.level;
    if (level !== 2 && level !== 3 && level !== 4) return null;
    return { type: "heading", level, children };
  }

  if (value.type === "quote") {
    const children = normalizeContainer(value);
    return children ? { type: "quote", children } : null;
  }

  if (value.type === "list" && Array.isArray(value.children)) {
    const children = value.children.flatMap((item) => {
      if (!isRecord(item) || item.type !== "list-item") return [];
      const itemChildren = normalizeContainer(item);
      return itemChildren
        ? [{ type: "list-item" as const, children: itemChildren }]
        : [];
    });
    if (children.length === 0) return null;
    return {
      type: "list",
      ordered: value.format === "ordered",
      children,
    };
  }

  if (value.type === "image" || value.type === "media") {
    return normalizeImage(value, publicBase);
  }

  if (value.type === "table") {
    return normalizeTable(value);
  }

  if (value.type === "divider" || value.type === "horizontal-rule") {
    return { type: "divider" };
  }

  return null;
}

export function normalizeStrapiBlocks(
  value: unknown,
  publicBase?: string,
): RichContentBlock[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((block) => {
    const normalized = normalizeBlock(block, publicBase);
    return normalized ? [normalized] : [];
  });
}
