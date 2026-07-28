import { cp, mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceStatic = resolve(appRoot, ".next/static");
const standaloneRoot = resolve(appRoot, ".next/standalone/apps/web");
const targetStatic = resolve(standaloneRoot, ".next/static");

try {
  await stat(sourceStatic);
  await mkdir(targetStatic, { recursive: true });
  await cp(sourceStatic, targetStatic, { recursive: true });
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

await import(resolve(standaloneRoot, "server.js"));
