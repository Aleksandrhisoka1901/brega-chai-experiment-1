import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { basename, dirname, relative, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ensureRussianAdminLocale } from "../src/admin-localization.ts";
import adminApp, { setRussianAdminLocale } from "../src/admin/app.ts";

const translations = adminApp.config.translations.ru;
const sourceDirectory = fileURLToPath(new URL("../src", import.meta.url));

async function schemaFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) return schemaFiles(path);
      if (path.includes(`${sep}api${sep}`) && entry.name === "schema.json") {
        return [path];
      }
      if (
        path.includes(`${sep}components${sep}`) &&
        entry.name.endsWith(".json")
      ) {
        return [path];
      }
      return [];
    }),
  );
  return files.flat().sort();
}

test("enables Russian Strapi Admin and labels every custom field", async () => {
  assert.deepEqual(adminApp.config.locales, ["ru"]);

  const schemas = await schemaFiles(sourceDirectory);
  assert.ok(schemas.length > 0);

  for (const absolutePath of schemas) {
    const path = relative(sourceDirectory, absolutePath).split(sep).join("/");
    const schema = JSON.parse(await readFile(absolutePath, "utf8")) as {
      info: { displayName: string; singularName?: string };
      attributes: Record<string, unknown>;
    };
    const isApi = path.startsWith("api/");
    const uid = isApi
      ? `api::${path.split("/")[1]}.${schema.info.singularName}`
      : `${basename(dirname(path))}.${basename(path, ".json")}`;

    if (uid === "api::robots-txt.robots-txt") {
      assert.equal(schema.info.displayName, "robots.txt", path);
    } else {
      assert.match(schema.info.displayName, /[А-Яа-яЁё]/, path);
    }

    for (const attribute of Object.keys(schema.attributes)) {
      const prefix = isApi
        ? `content-manager.content-types.${uid}`
        : `content-manager.components.${uid}`;
      const key = `${prefix}.${attribute}` as keyof typeof translations;
      assert.equal(
        typeof translations[key],
        "string",
        `Missing Russian Admin label: ${key}`,
      );
      assert.match(translations[key], /[А-Яа-яЁё]/, key);
    }
  }

  assert.equal(
    translations["content-manager.content-types.api::product.product.seedKey"],
    "Системный ключ",
  );
});

test("defaults the browser and admin users to Russian", async () => {
  const stored = new Map<string, string>();
  setRussianAdminLocale({
    setItem(key, value) {
      stored.set(key, value);
    },
  });
  assert.equal(stored.get("strapi-admin-language"), "ru");

  let subscriber:
    | {
        beforeCreate(event: {
          params: { data: { preferedLanguage?: string } };
        }): void;
      }
    | undefined;
  const updates: unknown[] = [];
  await ensureRussianAdminLocale({
    db: {
      query: () => ({
        updateMany: async (input: unknown) => updates.push(input),
      }),
      lifecycles: {
        subscribe(input: typeof subscriber) {
          subscriber = input;
        },
      },
    },
  });

  assert.deepEqual(updates, [
    {
      where: { preferedLanguage: { $null: true } },
      data: { preferedLanguage: "ru" },
    },
  ]);
  const newUser = { params: { data: {} as { preferedLanguage?: string } } };
  subscriber?.beforeCreate(newUser);
  assert.equal(newUser.params.data.preferedLanguage, "ru");

  const englishUser = { params: { data: { preferedLanguage: "en" } } };
  subscriber?.beforeCreate(englishUser);
  assert.equal(englishUser.params.data.preferedLanguage, "en");
});
