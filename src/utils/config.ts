import { config as loadDotenv } from 'dotenv';

loadDotenv();

export const HOST = process.env.HOST ?? '0.0.0.0';
export const PORT = Number(process.env.PORT) || 3000;
export const DATABASE_URL = process.env.DB_URL;


