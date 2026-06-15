import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load backend/.env first, with backend/server/.env kept as a local legacy fallback.
dotenv.config({ path: join(__dirname, '../../.env') });
dotenv.config({ path: join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL || '';
const databaseSsl = process.env.DATABASE_SSL || 'auto';

export const config = {
    server: {
        port: process.env.PORT || 3001,
        nodeEnv: process.env.NODE_ENV || 'development'
    },
    database: {
        url: databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')
            ? databaseUrl
            : '',
        ssl: databaseSsl
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
    },
    email: {
        smtpHost: process.env.SMTP_HOST || '',
        smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
        smtpSecure: process.env.SMTP_SECURE === 'true',
        smtpUser: process.env.SMTP_USER || '',
        smtpPass: process.env.SMTP_PASS || '',
        from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'AANM <no-reply@aanm-assal.org>',
        replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM || process.env.SMTP_USER || ''
    }
    // Note: No API keys needed! Using free OpenStreetMap + Leaflet
};
