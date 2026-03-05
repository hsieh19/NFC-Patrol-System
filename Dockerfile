# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:20-alpine AS builder
ARG DB_TYPE=mysql
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 如果是 mysql 模式，修改 schema.prisma
RUN if [ "$DB_TYPE" = "mysql" ]; then \
    sed -i 's/provider = "sqlite"/provider = "mysql"/' prisma/schema.prisma; \
    fi

RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 3: Production runner (纯净生产阶段)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 安全加固：使用非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir .next && chown nextjs:nodejs .next

# 只拷贝编译后的独立产物 (Standalone)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

# 纯净启动，不经过 start.js
CMD ["node", "server.js"]
