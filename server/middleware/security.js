import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

// Security headers
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    }
});

// CORS configuration
export const corsOptions = cors({
    origin: config.cors.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
});

// Rate limiting
export const rateLimiter = rateLimit({
    windowMs: config.security.rateLimitWindowMs,
    max: config.security.rateLimitMaxRequests,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// API-specific rate limiting (stricter for POST requests)
export const submitRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Only 3 submissions per IP per 15 minutes
    message: {
        success: false,
        message: 'Too many lab submissions from this IP. Please wait before submitting again.'
    },
    standardHeaders: true,
    legacyHeaders: false
});