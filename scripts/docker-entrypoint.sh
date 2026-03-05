#!/bin/sh
set -e

echo "======================================"
echo "[System] Starting NFC Patrol System..."
echo "[System] Checking database schema..."
echo "======================================"

# 利用 prisma db push 自动比对和校验数据库。
# 如果表不存在，它会自动创建。如果表存在且需要更新，它会自动推送。
node ./node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss

echo "======================================"
echo "[System] Database is ready! Launching Server..."
echo "======================================"

# 交还控制权，启动 Next.js 主程序
exec "$@"
