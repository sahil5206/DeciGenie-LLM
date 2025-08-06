const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const documentProcessor = require('../services/documentProcessor');
const { query } = require('../config/database');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    await fs.ensureDir(uploadsDir);
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10 // Max 10 files at once
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.txt'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${fileExtension}`), false);
    }
  }
});

// Upload document
router.post('/upload', upload.single('document'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      });
    }

    // Validate file
    const validationErrors = documentProcessor.validateFile(req.file);
    if (validationErrors.length > 0) {
      // Clean up uploaded file
      await fs.remove(req.file.path);
      
      return res.status(400).json({
        error: 'File validation failed',
        details: validationErrors
      });
    }

    const userId = req.body.user_id || 'test@example.com';

    // Process the document
    const result = await documentProcessor.processDocument(
      req.file.path,
      req.file.originalname,
      userId
    );

    res.status(201).json({
      message: 'Document uploaded and processed successfully',
      documentId: result.documentId,
      filename: result.filename,
      textLength: result.textLength,
      chunksCount: result.chunksCount,
      status: result.status
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.remove(req.file.path);
      } catch (cleanupError) {
        console.error('Failed to cleanup file:', cleanupError);
      }
    }

    console.error('Upload error:', error);
    next(error);
  }
});

// Upload multiple documents
router.post('/upload-multiple', upload.array('documents', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please select files to upload'
      });
    }

    const userId = req.body.user_id || 'test@example.com';
    const results = [];
    const errors = [];

    for (const file of req.files) {
      try {
        // Validate file
        const validationErrors = documentProcessor.validateFile(file);
        if (validationErrors.length > 0) {
          errors.push({
            filename: file.originalname,
            errors: validationErrors
          });
          await fs.remove(file.path);
          continue;
        }

        // Process the document
        const result = await documentProcessor.processDocument(
          file.path,
          file.originalname,
          userId
        );

        results.push({
          filename: file.originalname,
          documentId: result.documentId,
          textLength: result.textLength,
          chunksCount: result.chunksCount,
          status: result.status
        });

      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        });
        
        // Clean up file
        try {
          await fs.remove(file.path);
        } catch (cleanupError) {
          console.error('Failed to cleanup file:', cleanupError);
        }
      }
    }

    res.status(201).json({
      message: 'Documents processed',
      successful: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    // Clean up all uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.remove(file.path);
        } catch (cleanupError) {
          console.error('Failed to cleanup file:', cleanupError);
        }
      }
    }

    console.error('Multiple upload error:', error);
    next(error);
  }
});

// Get all documents for a user
router.get('/', async (req, res, next) => {
  try {
    const userId = req.query.user_id || 'test@example.com';
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const documents = await documentProcessor.getDocumentsByUser(userId, limit, offset);

    res.json({
      documents: documents.map(doc => ({
        id: doc.id,
        filename: doc.original_filename,
        file_type: doc.file_type,
        file_size: doc.file_size,
        status: doc.status,
        chunks_count: parseInt(doc.chunks_count) || 0,
        created_at: doc.created_at,
        updated_at: doc.updated_at
      })),
      pagination: {
        limit,
        offset,
        total: documents.length
      }
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    next(error);
  }
});

// Get document by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await documentProcessor.getDocumentById(id);

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: 'The requested document does not exist'
      });
    }

    res.json({
      id: document.id,
      filename: document.original_filename,
      file_type: document.file_type,
      file_size: document.file_size,
      status: document.status,
      chunks_count: parseInt(document.chunks_count) || 0,
      created_at: document.created_at,
      updated_at: document.updated_at
    });

  } catch (error) {
    console.error('Error fetching document:', error);
    next(error);
  }
});

// Get document chunks
router.get('/:id/chunks', async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const chunksQuery = `
      SELECT id, chunk_index, content, created_at
      FROM document_chunks
      WHERE document_id = $1
      ORDER BY chunk_index
      LIMIT $2 OFFSET $3
    `;

    const result = await query(chunksQuery, [id, limit, offset]);

    res.json({
      chunks: result.rows,
      pagination: {
        limit,
        offset,
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Error fetching document chunks:', error);
    next(error);
  }
});

// Delete document
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await documentProcessor.deleteDocument(id);

    res.json({
      message: 'Document deleted successfully',
      documentId: result.documentId
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    next(error);
  }
});

// Get document statistics
router.get('/stats/summary', async (req, res, next) => {
  try {
    const userId = req.query.user_id || 'test@example.com';

    const statsQuery = `
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed_documents,
        COUNT(CASE WHEN status = 'uploaded' THEN 1 END) as pending_documents,
        SUM(file_size) as total_size,
        AVG(file_size) as avg_file_size,
        MAX(created_at) as last_upload_time
      FROM documents
      WHERE user_id = $1
    `;

    const result = await query(statsQuery, [userId]);
    const stats = result.rows[0];

    // Get total chunks count
    const chunksQuery = `
      SELECT COUNT(*) as total_chunks
      FROM document_chunks dc
      JOIN documents d ON dc.document_id = d.id
      WHERE d.user_id = $1
    `;

    const chunksResult = await query(chunksQuery, [userId]);
    stats.total_chunks = parseInt(chunksResult.rows[0].total_chunks) || 0;

    res.json({
      stats: {
        total_documents: parseInt(stats.total_documents) || 0,
        processed_documents: parseInt(stats.processed_documents) || 0,
        pending_documents: parseInt(stats.pending_documents) || 0,
        total_size: parseInt(stats.total_size) || 0,
        avg_file_size: parseInt(stats.avg_file_size) || 0,
        total_chunks: stats.total_chunks,
        last_upload_time: stats.last_upload_time
      }
    });

  } catch (error) {
    console.error('Error fetching document stats:', error);
    next(error);
  }
});

module.exports = router; 