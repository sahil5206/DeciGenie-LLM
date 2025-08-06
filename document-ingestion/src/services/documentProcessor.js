const fs = require('fs-extra');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { query } = require('../config/database');

class DocumentProcessor {
  constructor() {
    this.supportedFormats = ['.pdf', '.docx', '.txt'];
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.chunkSize = 1000; // characters per chunk
    this.chunkOverlap = 200; // characters overlap between chunks
  }

  async processDocument(filePath, originalFilename, userId = 'test@example.com') {
    try {
      const fileExtension = path.extname(originalFilename).toLowerCase();
      
      if (!this.supportedFormats.includes(fileExtension)) {
        throw new Error(`Unsupported file format: ${fileExtension}`);
      }

      // Read and extract text from document
      const text = await this.extractText(filePath, fileExtension);
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text content found in document');
      }

      // Create document record in database
      const documentId = await this.createDocumentRecord(originalFilename, filePath, fileExtension, userId);
      
      // Chunk the text and store in database
      const chunks = this.createChunks(text);
      await this.storeChunks(documentId, chunks);

      // Update document status
      await query(
        'UPDATE documents SET status = $1 WHERE id = $2',
        ['processed', documentId]
      );

      return {
        documentId,
        filename: originalFilename,
        textLength: text.length,
        chunksCount: chunks.length,
        status: 'processed'
      };

    } catch (error) {
      console.error('Document processing error:', error);
      throw error;
    }
  }

  async extractText(filePath, fileExtension) {
    try {
      const fileBuffer = await fs.readFile(filePath);

      switch (fileExtension) {
        case '.pdf':
          return await this.extractTextFromPDF(fileBuffer);
        case '.docx':
          return await this.extractTextFromDOCX(fileBuffer);
        case '.txt':
          return await this.extractTextFromTXT(fileBuffer);
        default:
          throw new Error(`Unsupported file format: ${fileExtension}`);
      }
    } catch (error) {
      console.error('Text extraction error:', error);
      throw new Error(`Failed to extract text from document: ${error.message}`);
    }
  }

  async extractTextFromPDF(buffer) {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  async extractTextFromDOCX(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      throw new Error(`DOCX parsing failed: ${error.message}`);
    }
  }

  async extractTextFromTXT(buffer) {
    try {
      return buffer.toString('utf-8');
    } catch (error) {
      throw new Error(`TXT parsing failed: ${error.message}`);
    }
  }

  createChunks(text) {
    const chunks = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + this.chunkSize, text.length);
      let chunk = text.substring(startIndex, endIndex);

      // Try to break at sentence boundaries
      if (endIndex < text.length) {
        const lastPeriod = chunk.lastIndexOf('.');
        const lastNewline = chunk.lastIndexOf('\n');
        const breakPoint = Math.max(lastPeriod, lastNewline);
        
        if (breakPoint > startIndex + this.chunkSize * 0.7) {
          chunk = chunk.substring(0, breakPoint + 1);
          startIndex = startIndex + breakPoint + 1;
        } else {
          startIndex = endIndex;
        }
      } else {
        startIndex = endIndex;
      }

      // Clean up the chunk
      chunk = chunk.trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      // Apply overlap
      if (startIndex < text.length) {
        startIndex = Math.max(0, startIndex - this.chunkOverlap);
      }
    }

    return chunks;
  }

  async createDocumentRecord(filename, filePath, fileType, userId) {
    const stats = await fs.stat(filePath);
    const documentId = require('uuid').v4();

    const insertQuery = `
      INSERT INTO documents (id, user_id, filename, original_filename, file_type, file_size, file_path, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;

    const result = await query(insertQuery, [
      documentId,
      userId,
      path.basename(filePath),
      filename,
      fileType,
      stats.size,
      filePath,
      'uploaded'
    ]);

    return result.rows[0].id;
  }

  async storeChunks(documentId, chunks) {
    const insertChunkQuery = `
      INSERT INTO document_chunks (document_id, chunk_index, content)
      VALUES ($1, $2, $3)
    `;

    for (let i = 0; i < chunks.length; i++) {
      await query(insertChunkQuery, [documentId, i, chunks[i]]);
    }
  }

  async getDocumentById(documentId) {
    const query = `
      SELECT 
        d.*,
        COUNT(dc.id) as chunks_count
      FROM documents d
      LEFT JOIN document_chunks dc ON d.id = dc.document_id
      WHERE d.id = $1
      GROUP BY d.id
    `;

    const result = await query(query, [documentId]);
    return result.rows[0];
  }

  async getDocumentsByUser(userId, limit = 50, offset = 0) {
    const query = `
      SELECT 
        d.*,
        COUNT(dc.id) as chunks_count
      FROM documents d
      LEFT JOIN document_chunks dc ON d.id = dc.document_id
      WHERE d.user_id = $1
      GROUP BY d.id
      ORDER BY d.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await query(query, [userId, limit, offset]);
    return result.rows;
  }

  async deleteDocument(documentId) {
    // Get document info
    const document = await this.getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Delete file from filesystem
    try {
      await fs.remove(document.file_path);
    } catch (error) {
      console.warn('Failed to delete file from filesystem:', error);
    }

    // Delete from database (cascade will handle chunks)
    await query('DELETE FROM documents WHERE id = $1', [documentId]);

    return { success: true, documentId };
  }

  validateFile(file) {
    const errors = [];

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size exceeds maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check file extension
    const extension = path.extname(file.originalname).toLowerCase();
    if (!this.supportedFormats.includes(extension)) {
      errors.push(`Unsupported file format. Supported formats: ${this.supportedFormats.join(', ')}`);
    }

    return errors;
  }
}

module.exports = new DocumentProcessor(); 