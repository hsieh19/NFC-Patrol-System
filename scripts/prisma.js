const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 获取当前想使用的类型
const dbType = process.env.DB_TYPE || 'sqlite';
let dbUrl = '';

if (dbType === 'sqlite') {
    dbUrl = 'file:./dev.db';
    console.log('🔄 [Prisma 动态引擎] 当前识别到 DB_TYPE=sqlite, 正在组装 SQLite 本地存储...');
} else {
    const host = process.env.MYSQL_HOST || 'localhost';
    const port = process.env.MYSQL_PORT || '3306';
    const user = process.env.MYSQL_USER || 'root';
    const password = process.env.MYSQL_PASSWORD || '';
    const database = process.env.MYSQL_DATABASE || 'nfc_patrol_system';
    dbUrl = `mysql://${user}:${password}@${host}:${port}/${database}`;
    console.log('🔄 [Prisma 动态引擎] 当前识别到 DB_TYPE=mysql, 正在组装长短连接串...');
}

// 核心：动态替换 schema.prisma 内的 provider
const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schemaContent = fs.readFileSync(schemaPath, 'utf-8');

// 正则替换 datasource db 当前的 provider
const newProvider = dbType === 'mysql' ? 'mysql' : 'sqlite';
const updatedSchema = schemaContent.replace(
    /(datasource\s+db\s*\{[\s\S]*?provider\s*=\s*")[^"]+(")/,
    `$1${newProvider}$2`
);

if (schemaContent !== updatedSchema) {
    fs.writeFileSync(schemaPath, updatedSchema);
    console.log(`✅ [Prisma 动态引擎] 成功将底层引擎拨换至: ${newProvider}`);
}

// 强制注入 DATABASE_URL 给 Prisma 命令行子进程
process.env.DATABASE_URL = dbUrl;

// 放行之后的 prisma 命令
const args = process.argv.slice(2).join(' ');
if (args) {
    console.log(`🚀 执行封装命令: npx prisma ${args}\n`);
    try {
        execSync(`npx prisma ${args}`, { stdio: 'inherit', env: process.env });
    } catch (e) {
        process.exit(1);
    }
}
