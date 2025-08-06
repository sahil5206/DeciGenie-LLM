const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const { connectDatabase } = require('./config/database');
const documentRoutes = require('./routes/documents');
const healthRoutes = require('./routes/health');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 8001;

// Trust proxy for rate limiting behind nginx
app.set('trust proxy', 1);

// Create uploads directory if it doesn't exist
const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
fs.ensureDirSync(uploadsDir);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000', 
    'http://frontend:3000',
    'http://frontend-service:80',
    'https://decigenie.your-domain.com' // Replace with your actual domain
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));

// Debug middleware for upload requests
app.use('/api/documents/upload', (req, res, next) => {
  console.log('Upload request received:', {
    method: req.method,
    headers: req.headers,
    body: req.body ? 'Body present' : 'No body',
    files: req.files ? Object.keys(req.files) : 'No files'
  });
  next();
});

// Compression
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploaded documents
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/documents', documentRoutes);
app.use('/health', healthRoutes);

// Document API routes with prefix (for ingress routing)
app.use('/document-api/api/documents', documentRoutes);
app.use('/document-api/health', healthRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'DeciGenie LLM Document Ingestion Service',
    version: '1.0.0',
    status: 'running',
    uploads_directory: uploadsDir
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected successfully');

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Document Ingestion Service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`📁 Uploads directory: ${uploadsDir}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer(); 