import { PrismaClient } from '@prisma/client';

const getDatabaseUrl = () => {
  const dbType = process.env.DB_TYPE || 'sqlite';
  
  if (dbType === 'sqlite') {
    return 'file:./dev.db';
  }
  
  const host = process.env.MYSQL_HOST || 'localhost';
  const port = process.env.MYSQL_PORT || '3306';
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'xungeng';
  
  return `mysql://${user}:${password}@${host}:${port}/${database}`;
};

// Set the DATABASE_URL environment variable dynamically if not already set
// This allows Prisma to find it even if it's not in the .env file
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = getDatabaseUrl();
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
