import assert from "node:assert/strict";
import test from "node:test";

import createPluginsConfig from "../config/plugins.ts";

function createEnv(values: Record<string, string>) {
  return (name: string, fallback?: string) => values[name] ?? fallback;
}

test("configures the Mailgun HTTP API provider from environment variables", () => {
  const plugins = createPluginsConfig({
    env: createEnv({
      EMAIL_PROVIDER: "mailgun",
      EMAIL_FROM: "Voltora <postmaster@sandbox.example.mailgun.org>",
      EMAIL_REPLY_TO: "orders@example.test",
      MAILGUN_API_KEY: "test-api-key",
      MAILGUN_DOMAIN: "sandbox.example.mailgun.org",
      MAILGUN_URL: "https://api.eu.mailgun.net",
    }),
  });

  assert.deepEqual(plugins.email.config, {
    provider: "mailgun",
    providerOptions: {
      key: "test-api-key",
      domain: "sandbox.example.mailgun.org",
      url: "https://api.eu.mailgun.net",
    },
    settings: {
      defaultFrom: "Voltora <postmaster@sandbox.example.mailgun.org>",
      defaultReplyTo: "orders@example.test",
    },
  });
});

test("keeps Nodemailer as the default provider for local development", () => {
  const plugins = createPluginsConfig({ env: createEnv({}) });

  assert.equal(plugins.email.config.provider, "nodemailer");
  assert.equal(plugins.email.config.providerOptions.host, "localhost");
  assert.equal(plugins.email.config.providerOptions.port, 1025);
});
