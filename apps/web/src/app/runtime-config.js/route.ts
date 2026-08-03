import {
  collectPublicRuntimeConfig,
  createRuntimeConfigScript,
} from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export const GET = () =>
  new Response(
    createRuntimeConfigScript(collectPublicRuntimeConfig(process.env)),
    {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/javascript; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
