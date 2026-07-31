import express from 'express';
import { config } from './config/index.js';
import database from './database/index.js';
import pendingRegistrationReminderService from './services/pendingRegistrationReminderService.js';

// Middleware
import { securityHeaders, corsOptions, publicReadRateLimiter, adminRateLimiter } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Routes
import systemRoutes from './routes/system.js';
import labRoutes from './routes/labs.js';
import adminRoutes from './routes/admin.js';
import seminaireRoutes from './routes/seminaires.js';

const app = express();

app.set('trust proxy', config.server.trustProxy);

// Security middleware
app.use(securityHeaders);
app.use(corsOptions);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root route for platform health checks and direct backend URL visits
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'AANM API is running',
        endpoints: {
            health: '/api/health',
            labs: '/api/labs',
            seminaires: '/api/seminaires'
        }
    });
});

// API Routes
app.use('/api', systemRoutes);
app.use('/api/labs', publicReadRateLimiter, labRoutes);
app.use('/api/admin', adminRateLimiter, adminRoutes);
app.use('/api/seminaires', publicReadRateLimiter, seminaireRoutes);

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
│ Database: PostgreSQL                │
│ Health: GET /api/health             │
└─────────────────────────────────────┘
            `);
        });
        pendingRegistrationReminderService.start();
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server gracefully...');
    
    try {
        pendingRegistrationReminderService.stop();
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
