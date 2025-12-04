const { Pool } = require('pg');

// Environment: DEV, QA, PROD
const env = process.env.APP_ENV || 'DEV';
const useSSL = ['QA', 'PROD'].includes(env);

const pool = new Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: useSSL ? { rejectUnauthorized: false } : false
});

console.log(`Database connecting to ${env} environment`);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
