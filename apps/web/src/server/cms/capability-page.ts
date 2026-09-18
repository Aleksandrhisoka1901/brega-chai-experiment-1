import "server-only";

import { publicMediaOrigin } from "@/server/public-runtime-config";
import {
  FALLBACK_CAPABILITY_PAGE,
  type CapabilityPageContent,
} from "@/server/capability-models";

import { fetchCms } from "./client";
import {
  capabilityPageRequest,
  mapCapabilityPagePayload,
} from "./capability-page-mapper";
import { CmsUnavailableError, CmsValidationError } from "./errors";

export async function getCapabilityPage(): Promise<CapabilityPageContent> {
  try {
    const request = capabilityPageRequest();
    const payload = await fetchCms(request.path, { tags: [...request.tags] });
    return (
      mapCapabilityPagePayload(payload, publicMediaOrigin()) ??
      FALLBACK_CAPABILITY_PAGE
    );
  } catch (error) {
    if (
      error instanceof CmsUnavailableError ||
      error instanceof CmsValidationError
    ) {
      return FALLBACK_CAPABILITY_PAGE;
    }
    throw error;
  }
}
