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

# 安装运行 prisma engine 必备的底层依赖 openssl
RUN apk add --no-cache openssl

# 安全加固：使用非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir .next && chown nextjs:nodejs .next

# 只拷贝编译后的独立产物 (Standalone)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 拷贝 prisma 结构和命令行工具，以便在容器启动时支持 db push 建表
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# 配置容器入口校验脚本
COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
# 赋予执行权限并强制消除 Windows 的 \r 换行符（防止 shell 报错）
RUN chmod +x ./scripts/docker-entrypoint.sh && sed -i 's/\r$//' ./scripts/docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT 3000

# 让入口脚本接管启动生命周期，执行完建表后再启动 server.js
ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
CMD ["node", "server.js"]
