import { Pool } from "pg";

const isDev = process.env.npm_lifecycle_event === "start:dev";

export const sqlClient = new Pool({
  host: isDev ? "localhost" : process.env.NEO_DB_HOST,
  port: isDev ? 5432 : Number(process.env.NEO_DB_PORT),
  database: isDev ? "postgres" : process.env.NEO_DB_DATABASE,
  user: isDev ? "postgres" : process.env.NEO_DB_USERNAME,
  password: isDev ? "123456" : process.env.NEO_DB_PASSWORD,
  max: 30,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: {
    rejectUnauthorized: false,
  },
});
