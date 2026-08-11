import { cp, mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceStatic = resolve(appRoot, ".next/static");
const sourcePublic = resolve(appRoot, "public");
const standaloneRoot = resolve(appRoot, ".next/standalone/apps/web");
const targetStatic = resolve(standaloneRoot, ".next/static");
const targetPublic = resolve(standaloneRoot, "public");

const copyDirectory = async (source, target) => {
  try {
    await stat(source);
    await mkdir(target, { recursive: true });
    await cp(source, target, { recursive: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
};

await Promise.all([
  copyDirectory(sourceStatic, targetStatic),
  copyDirectory(sourcePublic, targetPublic),
]);

await import(resolve(standaloneRoot, "server.js"));
