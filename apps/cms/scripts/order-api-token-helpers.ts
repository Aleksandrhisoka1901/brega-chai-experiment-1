export const ORDER_CREATE_PERMISSION = "api::order.order.create";
export const DEFAULT_ORDER_TOKEN_NAME = "local-order-create";

type ApiToken = {
  id: number | string;
  accessKey?: string;
  type?: string;
  permissions?: string[];
};

export type ContentApiTokenService = {
  getByName(
    name: string,
    options: { includeDecryptedKey: true },
  ): Promise<ApiToken | null>;
  create(attributes: {
    name: string;
    description: string;
    type: "custom";
    permissions: string[];
    lifespan: null;
  }): Promise<ApiToken>;
  update(
    id: number | string,
    attributes: { type: "custom"; permissions: string[] },
  ): Promise<unknown>;
};

export async function emitAccessKey(
  accessKey: string,
  outputFile: string | undefined,
  output: {
    writeFile(
      path: string,
      data: string,
      options: { mode: number },
    ): Promise<unknown>;
    writeStdout(data: string): unknown;
  },
) {
  if (outputFile) {
    await output.writeFile(outputFile, accessKey, { mode: 0o600 });
    return;
  }
  output.writeStdout(accessKey);
}

export function assertLocalOrTestEnvironment(nodeEnv: string | undefined) {
  const environment = nodeEnv ?? "development";
  if (environment !== "development" && environment !== "test") {
    throw new Error(
      `Order API token setup is restricted to development/test (received NODE_ENV=${environment})`,
    );
  }
}

function hasExactOrderCreateScope(token: ApiToken) {
  return (
    token.type === "custom" &&
    token.permissions?.length === 1 &&
    token.permissions[0] === ORDER_CREATE_PERMISSION
  );
}

function requireAccessKey(token: ApiToken) {
  if (!token.accessKey) {
    throw new Error("Strapi did not return a decryptable API token access key");
  }
  return token.accessKey;
}

export async function ensureOrderCreateToken(
  service: ContentApiTokenService,
  name = DEFAULT_ORDER_TOKEN_NAME,
) {
  const existing = await service.getByName(name, {
    includeDecryptedKey: true,
  });

  if (!existing) {
    const created = await service.create({
      name,
      description: "Local/test token for private order creation",
      type: "custom",
      permissions: [ORDER_CREATE_PERMISSION],
      lifespan: null,
    });
    return requireAccessKey(created);
  }

  if (!hasExactOrderCreateScope(existing)) {
    await service.update(existing.id, {
      type: "custom",
      permissions: [ORDER_CREATE_PERMISSION],
    });
  }

  return requireAccessKey(existing);
}
