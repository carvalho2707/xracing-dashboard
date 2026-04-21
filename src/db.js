const { Pool } = require('pg');

// Environment: DEV, QA, PROD
const env = process.env.APP_ENV || 'DEV';
const useSSL = ['QA', 'PROD'].includes(env);

// On Vercel each invocation may create a new pool; keep it small to avoid
// exhausting Postgres connections. Locally this is still fine.
const isServerless = !!process.env.VERCEL;

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: isServerless ? 1 : 10,
    }
  : {
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || '5432'),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl: useSSL ? { rejectUnauthorized: false } : false,
      max: isServerless ? 1 : 10,
    };

const pool = new Pool(poolConfig);

console.log(`Database connecting to ${env} environment (${connectionString ? 'DATABASE_URL' : 'PG* vars'})`);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
