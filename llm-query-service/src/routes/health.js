const express = require('express');
const { query } = require('../config/database');

const router = express.Router();

// Basic health check
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'llm-query-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Detailed health check with database connectivity
router.get('/detailed', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test database connection
    const dbResult = await query('SELECT NOW() as current_time');
    const dbLatency = Date.now() - startTime;
    
    // Check environment variables
    const envChecks = {
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      DATABASE_URL: !!process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV || 'development'
    };
    
    const healthStatus = {
      status: 'healthy',
      service: 'llm-query-service',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      checks: {
        database: {
          status: 'healthy',
          latency: `${dbLatency}ms`,
          current_time: dbResult.rows[0].current_time
        },
        environment: envChecks,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        uptime: process.uptime()
      }
    };
    
    // Check if all required environment variables are set
    const missingEnvVars = Object.entries(envChecks)
      .filter(([key, value]) => !value && key !== 'NODE_ENV')
      .map(([key]) => key);
    
    if (missingEnvVars.length > 0) {
      healthStatus.status = 'degraded';
      healthStatus.warnings = [`Missing environment variables: ${missingEnvVars.join(', ')}`];
    }
    
    res.json(healthStatus);
    
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'llm-query-service',
      timestamp: new Date().toISOString(),
      error: error.message,
      checks: {
        database: {
          status: 'unhealthy',
          error: error.message
        }
      }
    });
  }
});

// Readiness check
router.get('/ready', async (req, res) => {
  try {
    // Test database connection
    await query('SELECT 1');
    
    res.json({
      status: 'ready',
      service: 'llm-query-service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      service: 'llm-query-service',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Liveness check
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    service: 'llm-query-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router; 