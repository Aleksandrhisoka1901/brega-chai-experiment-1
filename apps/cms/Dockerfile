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
EXPOSE 1337
CMD ["yarn", "workspace", "@brega-chai/cms", "develop"]

FROM dependencies AS build
COPY . .
ENV NODE_ENV=production
RUN yarn workspace @brega-chai/cms build

FROM dependencies AS production-dependencies
RUN yarn workspaces focus @brega-chai/cms --production

FROM node:22.18.0-bookworm-slim AS production
WORKDIR /workspace
RUN corepack enable
ENV NODE_ENV=production
COPY --chown=node:node package.json yarn.lock .yarnrc.yml ./
COPY --chown=node:node apps/cms/package.json apps/cms/package.json
COPY --chown=node:node apps/cms/tsconfig.json apps/cms/tsconfig.json
COPY --chown=node:node --from=production-dependencies /workspace/node_modules ./node_modules
COPY --chown=node:node --from=production-dependencies /workspace/apps/cms/node_modules ./apps/cms/node_modules
COPY --chown=node:node --from=build /workspace/apps/cms/config ./apps/cms/config
COPY --chown=node:node --from=build /workspace/apps/cms/src ./apps/cms/src
COPY --chown=node:node --from=build /workspace/apps/cms/dist ./apps/cms/dist
RUN mkdir -p /workspace/apps/cms/public/uploads \
  && chown -R node:node /workspace/apps/cms/public
WORKDIR /workspace/apps/cms
USER node
EXPOSE 1337
CMD ["node", "node_modules/@strapi/strapi/bin/strapi.js", "start"]
