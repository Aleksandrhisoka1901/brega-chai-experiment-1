import { z } from "zod";

import {
  FALLBACK_CAPABILITY_PAGE,
  fallbackCapabilityImage,
  type CapabilityColumn,
  type CapabilityPageContent,
  type CapabilityRow,
} from "../capability-models.ts";
import { CmsValidationError } from "./errors.ts";
import { versionCmsMediaUrl } from "./media-url.ts";

const mediaSchema = z
  .object({
    url: z.string().min(1),
    updatedAt: z.string().optional(),
  })
  .nullable()
  .optional();

const payloadSchema = z.object({
  data: z
    .object({
      eyebrow: z.string().trim().optional().nullable(),
      title: z.string().trim().min(1),
      lead: z.string().trim().min(1),
      note: z.string().trim().optional().nullable(),
      tableTitle: z.string().trim().min(1),
      models: z
        .array(
          z.object({
            slug: z.string().trim().min(1),
            name: z.string().trim().min(1),
            description: z.string().trim().min(1),
            productModel: z.string().trim().optional().nullable(),
            image: mediaSchema,
          }),
        )
        .min(1),
      specRows: z
        .array(
          z.object({
            label: z.string().trim().min(1),
            cells: z
              .array(z.object({ value: z.string().trim().min(1) }))
              .min(1),
          }),
        )
        .min(1),
    })
    .nullable(),
});

export function capabilityPageRequest() {
  const query = new URLSearchParams({
    status: "published",
    "fields[0]": "eyebrow",
    "fields[1]": "title",
    "fields[2]": "lead",
    "fields[3]": "note",
    "fields[4]": "tableTitle",
  });
  query.set("populate[models][fields][0]", "slug");
  query.set("populate[models][fields][1]", "name");
  query.set("populate[models][fields][2]", "description");
  query.set("populate[models][fields][3]", "productModel");
  query.set("populate[models][populate][image][fields][0]", "url");
  query.set("populate[models][populate][image][fields][1]", "updatedAt");
  query.set("populate[specRows][fields][0]", "label");
  query.set("populate[specRows][populate][cells][fields][0]", "value");

  return {
    path: `/api/capability-page?${query}`,
    tags: ["capability-page"],
  } as const;
}

function padValues(values: string[], count: number) {
  const next = values.slice(0, count);
  while (next.length < count) next.push("—");
  return next;
}

export function mapCapabilityPagePayload(
  payload: unknown,
  publicBase: string,
): CapabilityPageContent | null {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) throw new CmsValidationError(parsed.error.message);
  if (!parsed.data.data) return null;

  const models: CapabilityColumn[] = parsed.data.data.models.map((model) => ({
    id: model.slug,
    name: model.name,
    description: model.description,
    productModel: model.productModel?.trim() || model.name,
    image: model.image?.url
      ? versionCmsMediaUrl(model.image.url, publicBase, model.image.updatedAt)
      : fallbackCapabilityImage(model.slug),
  }));

  const rows: CapabilityRow[] = parsed.data.data.specRows.map((row) => ({
    label: row.label,
    values: padValues(
      row.cells.map((cell) => cell.value),
      models.length,
    ),
  }));

  return {
    eyebrow: parsed.data.data.eyebrow?.trim() || FALLBACK_CAPABILITY_PAGE.eyebrow,
    title: parsed.data.data.title,
    lead: parsed.data.data.lead,
    note: parsed.data.data.note?.trim() || FALLBACK_CAPABILITY_PAGE.note,
    tableTitle: parsed.data.data.tableTitle,
    models,
    rows,
  };
}
