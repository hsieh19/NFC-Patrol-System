#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 正在准备启动系统...');

// 检查数据库文件是否存在
const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
const migrationsPath = path.join(__dirname, '..', 'prisma', 'migrations');

// 检查并创建 migrations 目录
if (!fs.existsSync(migrationsPath)) {
    fs.mkdirSync(migrationsPath, { recursive: true });
    console.log('📁 创建 migrations 目录');
}

// 运行数据库迁移
console.log('🧰 正在执行数据库迁移...');
try {
    // 尝试运行迁移
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ 数据库迁移成功');
} catch (error) {
    console.log('⚠️  迁移部署失败，尝试创建初始迁移...');
    try {
        // 如果没有迁移记录，创建初始迁移
        execSync('npx prisma migrate dev --name init --create-only', { stdio: 'inherit' });
        console.log('✅ 初始迁移创建成功');
        // 运行迁移
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        console.log('✅ 数据库迁移成功');
    } catch (error) {
        console.log('⚠️  初始迁移失败，可能需要手动处理');
    }
}

// 生成 Prisma 客户端
console.log('🔧 正在生成 Prisma 客户端...');
try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma 客户端生成成功');
} catch (error) {
    console.log('⚠️  Prisma 客户端生成失败，但继续启动服务');
}

// 启动开发服务器
const isHttps = process.argv.includes('--https');
console.log(`🚀 正在启动${isHttps ? ' HTTPS ' : ''}开发服务器...`);
const devCommand = isHttps ? 'next dev --experimental-https' : 'next dev';
execSync(devCommand, { stdio: 'inherit' });
