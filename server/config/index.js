import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const config = {
    server: {
        port: process.env.PORT || 3001,
        nodeEnv: process.env.NODE_ENV || 'development'
    },
    database: {
        url: process.env.DATABASE_URL || join(__dirname, '../database/labs.db')
    },
    security: {
        rateLimitWindowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        rateLimitMaxRequests: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS) || 10
    },
    cors: {
        allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://127.0.0.1:5173']
    },
    googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY
    }
};