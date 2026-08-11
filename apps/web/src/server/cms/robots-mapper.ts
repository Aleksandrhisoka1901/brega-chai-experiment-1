import { z } from "zod";

export const DEFAULT_ROBOTS_CONTENT = `User-agent: *
Disallow: /
`;

const MAX_ROBOTS_LENGTH = 20_000;
const responseSchema = z.object({
  data: z
    .object({
      content: z.string(),
    })
    .nullable(),
});

export function normalizeRobotsContent(content: string): string | null {
  const normalized = content
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim();

  if (
    normalized.length === 0 ||
    normalized.length > MAX_ROBOTS_LENGTH ||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(normalized) ||
    !/^\s*user-agent\s*:/im.test(normalized)
  ) {
    return null;
  }

  return `${normalized}\n`;
}

export function mapRobotsPayload(payload: unknown): string {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success || !parsed.data.data) return DEFAULT_ROBOTS_CONTENT;

  return (
    normalizeRobotsContent(parsed.data.data.content) ?? DEFAULT_ROBOTS_CONTENT
  );
}
