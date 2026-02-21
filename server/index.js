import express from 'express';
import { config } from './config/index.js';
import database from './database/index.js';

// Middleware
import { securityHeaders, corsOptions, rateLimiter } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Routes
import systemRoutes from './routes/system.js';
import labRoutes from './routes/labs.js';
import adminRoutes from './routes/admin.js';

const app = express();

// Security middleware
app.use(securityHeaders);
app.use(corsOptions);
app.use(rateLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', systemRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/admin', adminRoutes);

// Error handling
app.use('*', notFoundHandler);
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
    try {
        // Connect to database
        await database.connect();
        
        // Start server
        app.listen(config.server.port, () => {
            console.log(`
🚀 AANM Lab Directory Server
┌─────────────────────────────────────┐
│ Server: http://localhost:${config.server.port}     │
│ Environment: ${config.server.nodeEnv.padEnd(15)} │
│ Database: SQLite3                   │
│ Health: GET /api/health             │
└─────────────────────────────────────┘
            `);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server gracefully...');
    
    try {
        await database.close();
        console.log('✅ Server shutdown complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
startServer();