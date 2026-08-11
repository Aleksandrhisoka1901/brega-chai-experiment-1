import { getRobotsContent } from "@/server/cms/robots";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(await getRobotsContent(), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
