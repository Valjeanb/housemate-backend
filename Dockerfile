FROM oven/bun:1.3 AS builder

WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3-slim
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
