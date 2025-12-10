// api/modules/utils/db.ts
import { MongoClient, Db } from 'mongodb';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (cachedDb) return cachedDb;

  const url = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;

  // 校验环境变量是否存在
  if (!url) {
    throw new Error('MONGODB_URI 环境变量未设置，请检查 .env 文件');
  }
  if (!dbName) {
    throw new Error('MONGODB_DB 环境变量未设置，请检查 .env 文件');
  }

  //此时 TypeScript 知道 url 和 dbName 都是 string（类型收窄）
  const client = cachedClient || new MongoClient(url);
  if (!cachedClient) {
    await client.connect();
    cachedClient = client;
  }

  const db = client.db(dbName);
  cachedDb = db;
  return db;
}
