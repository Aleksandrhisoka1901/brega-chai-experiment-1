import { z } from "zod";

import {
  normalizeStrapiBlocks,
  type RichContentBlock,
} from "../../components/rich-content/model.ts";
import { BRAND_EMAIL, BRAND_NAME } from "../../lib/brand.ts";
import { CmsValidationError } from "./errors.ts";
import { versionCmsMediaUrl } from "./media-url.ts";

export type ConformityPage = {
  title: string;
  eyebrow?: string;
  content: RichContentBlock[];
  seo?: {
    title: string;
    description: string;
    imageUrl?: string;
  };
};

export const FALLBACK_CONFORMITY_PAGE: ConformityPage = {
  title: "Декларация соответствия",
  eyebrow: "Правовая информация",
  content: [
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          text: "Поставляемое оборудование сопровождается декларацией соответствия требованиям технических регламентов, применимым к портативным электростанциям и солнечным панелям.",
        },
      ],
    },
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          text: "Актуальный скан декларации направляется по запросу на ",
        },
        {
          type: "link",
          href: `mailto:${BRAND_EMAIL}`,
          external: false,
          children: [{ type: "text", text: BRAND_EMAIL }],
        },
        {
          type: "text",
          text: " или при оформлении заказа. После регистрации электронной копии документ будет опубликован на этой странице.",
        },
      ],
    },
  ],
  seo: {
    title: `Декларация соответствия — ${BRAND_NAME}`,
    description:
      "Декларация соответствия на портативные электростанции и солнечные панели. Актуальный документ предоставляется по запросу.",
  },
};

export function conformityPageRequest() {
  const query = new URLSearchParams({
    status: "published",
    "fields[0]": "title",
    "fields[1]": "eyebrow",
    "fields[2]": "content",
  });
  query.set("populate[seo][fields][0]", "title");
  query.set("populate[seo][fields][1]", "description");
  query.set("populate[seo][populate][image][fields][0]", "url");
  query.set("populate[seo][populate][image][fields][1]", "width");
  query.set("populate[seo][populate][image][fields][2]", "height");
  query.set("populate[seo][populate][image][fields][3]", "formats");
  query.set("populate[seo][populate][image][fields][4]", "updatedAt");
  query.set("populate[seo][populate][image][fields][5]", "alternativeText");

  return {
    path: `/api/conformity-page?${query}`,
    tags: ["conformity-page"],
  } as const;
}

const payloadSchema = z.object({
  data: z
    .object({
      title: z.string().trim().min(1),
      eyebrow: z.string().trim().min(1).nullable().optional(),
      content: z.unknown().optional(),
      seo: z
        .object({
          title: z.string().min(1),
          description: z.string().min(1),
          image: z
            .object({
              url: z.string().min(1),
              updatedAt: z.iso.datetime(),
            })
            .nullable()
            .optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable(),
});

export function mapConformityPagePayload(
  payload: unknown,
  publicBase: string,
): ConformityPage | null {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) throw new CmsValidationError(parsed.error.message);
  if (!parsed.data.data) return null;

  const { title, eyebrow, content, seo } = parsed.data.data;
  return {
    title,
    ...(eyebrow ? { eyebrow } : {}),
    content: normalizeStrapiBlocks(content, publicBase),
    ...(seo
      ? {
          seo: {
            title: seo.title,
            description: seo.description,
            ...(seo.image
              ? {
                  imageUrl: versionCmsMediaUrl(
                    seo.image.url,
                    publicBase,
                    seo.image.updatedAt,
                  ),
                }
              : {}),
          },
        }
      : {}),
    };
}
