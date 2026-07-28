# syntax=docker/dockerfile:1.7

FROM node:22.18.0-bookworm-slim AS base
WORKDIR /workspace
RUN corepack enable

FROM base AS dependencies
COPY package.json yarn.lock .yarnrc.yml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/cms/package.json apps/cms/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN yarn install --immutable

FROM dependencies AS development
COPY . .
EXPOSE 3000
CMD ["yarn", "workspace", "@brega-chai/web", "dev"]

FROM dependencies AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn workspace @brega-chai/contracts build \
  && yarn workspace @brega-chai/web build

FROM node:22.18.0-bookworm-slim AS production
WORKDIR /workspace
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
COPY --chown=node:node --from=build /workspace/apps/web/.next/standalone ./
COPY --chown=node:node --from=build /workspace/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
