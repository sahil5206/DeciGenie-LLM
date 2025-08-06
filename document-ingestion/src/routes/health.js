const express = require('express');
const { query } = require('../config/database');
const fs = require('fs-extra');
const path = require('path');

const router = express.Router();

// Basic health check
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'document-ingestion-service',
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
    
    // Check uploads directory
    const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    const uploadsDirExists = await fs.pathExists(uploadsDir);
    const uploadsDirWritable = uploadsDirExists ? await fs.access(uploadsDir).then(() => true).catch(() => false) : false;
    
    // Check environment variables
    const envChecks = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      UPLOAD_DIR: !!process.env.UPLOAD_DIR,
      NODE_ENV: process.env.NODE_ENV || 'development'
    };
    
    const healthStatus = {
      status: 'healthy',
      service: 'document-ingestion-service',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      checks: {
        database: {
          status: 'healthy',
          latency: `${dbLatency}ms`,
          current_time: dbResult.rows[0].current_time
        },
        filesystem: {
          status: uploadsDirExists && uploadsDirWritable ? 'healthy' : 'unhealthy',
          uploads_directory: uploadsDir,
          exists: uploadsDirExists,
          writable: uploadsDirWritable
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
    
    if (missingEnvVars.length > 0 || !uploadsDirExists || !uploadsDirWritable) {
      healthStatus.status = 'degraded';
      healthStatus.warnings = [];
      
      if (missingEnvVars.length > 0) {
        healthStatus.warnings.push(`Missing environment variables: ${missingEnvVars.join(', ')}`);
      }
      
      if (!uploadsDirExists) {
        healthStatus.warnings.push('Uploads directory does not exist');
      }
      
      if (!uploadsDirWritable) {
        healthStatus.warnings.push('Uploads directory is not writable');
      }
    }
    
    res.json(healthStatus);
    
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'document-ingestion-service',
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
    
    // Test filesystem access
    const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    await fs.ensureDir(uploadsDir);
    await fs.access(uploadsDir);
    
    res.json({
      status: 'ready',
      service: 'document-ingestion-service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      service: 'document-ingestion-service',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Liveness check
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    service: 'document-ingestion-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router; 