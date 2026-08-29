import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

const connectionUri = process.env.DATABASE_URL;

if (!connectionUri) {
  throw new Error(
    'DATABASE_URL no está definida. Copia .env.example a .env y configura la cadena de conexión de TiDB.'
  );
}

const pool = mysql.createPool({
  uri: connectionUri,
  ssl: {
    rejectUnauthorized: true,
  },
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
});

export const db = drizzle(pool, { schema, mode: 'default' });
export * from './schema';
