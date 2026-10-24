import app from './app.js';
import { connectDB } from './config/db.js';
import { config } from './config/config.js';
import { seedInitialData } from './utils/seed.js';

const startServer = async () => {
  try {
    await connectDB();
    
    // Auto-seed policies and sample users if collection is empty
    try {
      await seedInitialData();
    } catch (seedErr) {
      console.warn(`[Seed] Initial auto-seed note: ${seedErr.message}`);
    }

    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log(`=================================================`);
      console.log(` Marketplace Listing Quality Reviewer Server`);
      console.log(` Mode: ${config.nodeEnv}`);
      console.log(` Listening on: http://localhost:${config.port}`);
      console.log(` LLM Provider: ${config.llmProvider}`);
      console.log(` Client Origin: ${config.clientOrigin}`);
      console.log(`=================================================`);
    });

    // Graceful Shutdown
    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Closing HTTP server...`);
      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error(`[Server Fatal Error] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
