import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const requestHeaderNames = ["if-modified-since", "if-none-match", "range"];
const responseHeaderNames = [
  "accept-ranges",
  "cache-control",
  "content-length",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
];

const copyHeaders = (source, names) =>
  Object.fromEntries(
    names.flatMap((name) => {
      const value = source[name];
      return value === undefined ? [] : [[name, value]];
    }),
  );

const parseUpstream = (value) => {
  const upstream = new URL(value);
  if (
    (upstream.protocol !== "http:" && upstream.protocol !== "https:") ||
    upstream.username ||
    upstream.password ||
    upstream.pathname !== "/" ||
    upstream.search ||
    upstream.hash
  ) {
    throw new Error("DEV_IMAGE_UPSTREAM must be an HTTP(S) origin");
  }
  return upstream;
};

export const planDevMediaRequest = ({
  headers,
  method,
  requestUrl,
  upstreamOrigin,
}) => {
  if (method !== "GET" && method !== "HEAD") {
    return { headers: { Allow: "GET, HEAD" }, status: 405 };
  }

  const incomingUrl = new URL(requestUrl ?? "/", "http://127.0.0.1");
  if (!incomingUrl.pathname.startsWith("/storefront/")) {
    return { headers: {}, status: 404 };
  }

  const target = new URL(parseUpstream(upstreamOrigin));
  target.pathname = incomingUrl.pathname;
  target.search = incomingUrl.search;
  return {
    headers: copyHeaders(headers, requestHeaderNames),
    method,
    target,
  };
};

export const selectDevMediaResponseHeaders = (headers) =>
  copyHeaders(headers, responseHeaderNames);

export const createDevMediaProxy = ({ upstreamOrigin }) => {
  const upstream = parseUpstream(upstreamOrigin);
  const send = upstream.protocol === "https:" ? httpsRequest : httpRequest;

  return createServer((incoming, response) => {
    const plan = planDevMediaRequest({
      headers: incoming.headers,
      method: incoming.method,
      requestUrl: incoming.url,
      upstreamOrigin: upstream,
    });
    if ("status" in plan) {
      response.writeHead(plan.status, plan.headers);
      response.end();
      return;
    }

    const outgoing = send(
      plan.target,
      {
        headers: plan.headers,
        method: plan.method,
      },
      (upstreamResponse) => {
        response.writeHead(
          upstreamResponse.statusCode ?? 502,
          selectDevMediaResponseHeaders(upstreamResponse.headers),
        );
        upstreamResponse.pipe(response);
      },
    );
    outgoing.on("error", () => {
      if (!response.headersSent) response.writeHead(502);
      response.end();
    });
    incoming.on("aborted", () => outgoing.destroy());
    outgoing.end();
  });
};
