import express from 'express';
import database from '../database/index.js';
import { config } from '../config/index.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
    const healthCheck = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.server.nodeEnv,
        database: {
            connected: database.isConnected,
            type: 'PostgreSQL'
        },
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
    };

    res.json(healthCheck);
});

// Detailed system info (admin only in production)
router.get('/info', (req, res) => {
    if (config.server.nodeEnv === 'production') {
        return res.status(403).json({
            success: false,
            message: 'System info not available in production'
        });
    }

    const systemInfo = {
        node: {
            version: process.version,
            platform: process.platform,
            arch: process.arch
        },
        server: {
            port: config.server.port,
            environment: config.server.nodeEnv
        },
        database: {
            type: 'PostgreSQL',
            configured: Boolean(config.database.url),
            connected: database.isConnected
        },
        security: {
            rateLimitWindow: config.security.rateLimitWindowMs,
            rateLimitMax: config.security.rateLimitMaxRequests
        }
    };

    res.json(systemInfo);
});

export default router;
