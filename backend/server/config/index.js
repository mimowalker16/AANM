import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load backend/.env first, with backend/server/.env kept as a local legacy fallback.
dotenv.config({ path: join(__dirname, '../../.env') });
dotenv.config({ path: join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL || '';

export const config = {
    server: {
        port: process.env.PORT || 3001,
        nodeEnv: process.env.NODE_ENV || 'development'
    },
    database: {
        url: databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')
            ? databaseUrl
            : '',
        ssl: process.env.DATABASE_SSL === 'true'
    },
    security: {
        rateLimitWindowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        rateLimitMaxRequests: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS) || 100,
        publicReadRateLimitMaxRequests: parseInt(process.env.API_READ_RATE_LIMIT_MAX_REQUESTS) || 300,
        adminRateLimitMaxRequests: parseInt(process.env.API_ADMIN_RATE_LIMIT_MAX_REQUESTS) || 600,
        loginRateLimitMaxRequests: parseInt(process.env.API_LOGIN_RATE_LIMIT_MAX_REQUESTS) || 20
    },
    cors: {
        allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://127.0.0.1:5173']
    },
    auth: {
        adminUsername: process.env.ADMIN_USERNAME || 'admin',
        adminPassword: process.env.ADMIN_PASSWORD || 'aanm-admin-2026',
        jwtSecret: process.env.JWT_SECRET || 'aanm-jwt-super-secret-key-change-in-production',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h'
    }
    // Note: No API keys needed! Using free OpenStreetMap + Leaflet
};
