# Build stage: install deps and compile TypeScript to dist/.
FROM node:22-alpine AS build

ARG PNPM_VERSION=12.3.4

ENV HUSKY=0
RUN npm install -g pnpm@${PNPM_VERSION}

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Runtime stage: production dependencies only + compiled output.
FROM node:22-alpine AS runtime

ARG PNPM_VERSION=12.3.4

ENV NODE_ENV=production \
    HUSKY=0 \
    HOST=0.0.0.0 \
    PORT=3000
RUN npm install -g pnpm@${PNPM_VERSION}

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Runtime deps are pure JS, so lifecycle scripts (husky prepare, native builds) are skipped.
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/api.js"]
