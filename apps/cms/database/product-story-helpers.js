"use strict";

function storyToBlocks(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Preserve malformed legacy JSON-looking text as visible copy.
    }
  }

  return trimmed.split(/\n\s*\n/u).flatMap((paragraph) => {
    const text = paragraph.trim();
    return text
      ? [
          {
            type: "paragraph",
            children: [{ type: "text", text }],
          },
        ]
      : [];
  });
}

module.exports = { storyToBlocks };
