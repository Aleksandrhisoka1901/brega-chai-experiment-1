const CHAPTER_PREFIX = /^глава\s+\d{1,2}\s*(?:[·•.\-—|:]\s*)?/iu;
const BARE_CHAPTER_NUMBER = /^\d{1,2}$/;

export function sanitizeEditorialEyebrow(
  value: string | null | undefined,
): string | undefined {
  let text = value?.trim() ?? "";
  if (!text) return undefined;
  if (CHAPTER_PREFIX.test(text)) {
    text = text.replace(CHAPTER_PREFIX, "").trim();
  }
  if (!text || BARE_CHAPTER_NUMBER.test(text)) return undefined;
  return text;
}
