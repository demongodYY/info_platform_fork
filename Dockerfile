# Nuxt 3 SSR — build on server or in CI (Tencent Lighthouse Docker)
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
ARG SUPABASE_URL
ARG SUPABASE_SERVICE_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ENV SUPABASE_URL=${SUPABASE_URL} \
    SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY} \
    SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=builder /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
