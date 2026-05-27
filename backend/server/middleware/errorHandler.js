import { config } from '../config/index.js';

// Global error handler
export const errorHandler = (err, req, res, next) => {
    console.error('Error occurred:', {
        message: err.message,
        stack: config.server.nodeEnv === 'development' ? err.stack : undefined,
        url: req.url,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });

    // Default error response
    let statusCode = err.statusCode || 500;
    let message = 'Internal server error';

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation failed';
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Unauthorized access';
    } else if (err.code === 'SQLITE_CONSTRAINT') {
        statusCode = 400;
        message = 'Data constraint violation';
    } else if (config.server.nodeEnv === 'development') {
        message = err.message;
    }

    res.status(statusCode).json({
        success: false,
        message: message,
        ...(config.server.nodeEnv === 'development' && {
            error: {
                name: err.name,
                message: err.message,
                stack: err.stack
            }
        })
    });
};

// 404 handler
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: `API endpoint not found: ${req.method} ${req.path}`
    });
};

// Async error wrapper
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};