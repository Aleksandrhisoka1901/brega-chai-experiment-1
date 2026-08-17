import { spawn } from "node:child_process";

import { createDevMediaProxy } from "./dev-media-proxy.mjs";

const upstreamOrigin = process.env.DEV_IMAGE_UPSTREAM;
if (!upstreamOrigin) throw new Error("Set DEV_IMAGE_UPSTREAM");

const proxy = createDevMediaProxy({ upstreamOrigin });
proxy.listen(9000, "127.0.0.1", () => {
  const next = spawn("yarn", ["workspace", "@brega-chai/web", "dev"], {
    stdio: "inherit",
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => next.kill(signal));
  }

  next.once("exit", (code) => {
    proxy.close(() => process.exit(code ?? 1));
  });
});

proxy.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
