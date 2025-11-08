import { Pool } from 'pg';
import { DATABASE_URL } from './utils/config.js';

export const pool = new Pool({
  connectionString: DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

