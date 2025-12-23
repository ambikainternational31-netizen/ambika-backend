const cluster = require('cluster');
const os = require('os');
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;
const CLUSTER_MODE = process.env.CLUSTER_MODE === 'true';
// Optimize worker count for Render's memory constraints
const numCPUs = process.env.NODE_ENV === 'production' ? 2 : Math.min(os.cpus().length, 4);

if (CLUSTER_MODE && cluster.isMaster) {
  logger.info(`Master ${process.pid} is running`);
  logger.info(`Starting ${numCPUs} workers`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker exit
  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
    logger.info('Starting a new worker');
    cluster.fork();
  });

  // Handle worker online
  cluster.on('online', (worker) => {
    logger.info(`Worker ${worker.process.pid} is online`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('Master received SIGTERM, shutting down workers');
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
  });

  process.on('SIGINT', () => {
    logger.info('Master received SIGINT, shutting down workers');
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
  });

} else {
  // Worker process
  const server = app.listen(PORT, '0.0.0.0', () => {
    const workerInfo = cluster.isWorker ? `Worker ${process.pid}` : 'Server';
    logger.info(`${workerInfo} is running on port ${PORT}`);
    
    // Always show basic info for Render logs
    console.log(`🚀 ${workerInfo} is running on http://localhost:${PORT}`);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📋 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/api`);
    }
  });

  // Graceful shutdown for workers
  const gracefulShutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    
    server.close(() => {
      logger.info('HTTP server closed');
      
      // Close database connections
      const mongoose = require('mongoose');
      mongoose.connection.close().then(() => {
        logger.info('MongoDB connection closed');
        process.exit(0);
      }).catch((err) => {
        logger.error('Error closing MongoDB connection:', err);
        process.exit(1);
      });
    });

    // Force close server after 10 seconds (faster for Render)
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Promise Rejection:', err);
    gracefulShutdown('unhandledRejection');
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
  });

  // Handle worker disconnect
  if (cluster.isWorker) {
    process.on('disconnect', () => {
      logger.info('Worker disconnected from master');
      gracefulShutdown('disconnect');
    });
  }

  // Export server for testing
  module.exports = server;
}