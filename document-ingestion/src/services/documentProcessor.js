const path = require('path');
const fs = require('fs-extra');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { v4: uuidv4 } = require('uuid');
const { query, run } = require('../config/database');

class DocumentProcessor {
  constructor() {
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.supportedFormats = ['.pdf', '.docx', '.txt'];
  }

  async processDocument(filePath, originalFilename, userId = 'test@example.com') {
    try {
      console.log(`Processing document: ${originalFilename}`);

      // Extract text from document
      const fileExtension = path.extname(originalFilename).toLowerCase();
      const extractedText = await this.extractText(filePath, fileExtension);

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from the document');
      }

      // Create document record
      const documentId = await this.createDocumentRecord(originalFilename, filePath, fileExtension, userId);

      // Create chunks from text
      const chunks = this.createChunks(extractedText);

      // Store chunks
      await this.storeChunks(documentId, chunks);

      console.log(`Document processed successfully: ${originalFilename}`);
      return {
        documentId,
        filename: originalFilename,
        chunksCount: chunks.length,
        textLength: extractedText.length
      };
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  async extractText(filePath, fileExtension) {
    try {
      const buffer = await fs.readFile(filePath);

      switch (fileExtension) {
        case '.pdf':
          return await this.extractTextFromPDF(buffer);
        case '.docx':
          return await this.extractTextFromDOCX(buffer);
        case '.txt':
          return await this.extractTextFromTXT(buffer);
        default:
          throw new Error(`Unsupported file format: ${fileExtension}`);
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      throw error;
    }
  }

  async extractTextFromPDF(buffer) {
    const data = await pdf(buffer);
    return data.text;
  }

  async extractTextFromDOCX(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  async extractTextFromTXT(buffer) {
    return buffer.toString('utf-8');
  }

  createChunks(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
      let end = start + chunkSize;

      // If this isn't the last chunk, try to break at a sentence boundary
      if (end < text.length) {
        const nextPeriod = text.indexOf('.', end - 100);
        const nextNewline = text.indexOf('\n', end - 100);

        if (nextPeriod > end - 100 && nextPeriod < end + 100) {
          end = nextPeriod + 1;
        } else if (nextNewline > end - 100 && nextNewline < end + 100) {
          end = nextNewline + 1;
        }
      }

      chunks.push(text.substring(start, end).trim());
      start = end - overlap;

      if (start >= text.length) break;
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  async createDocumentRecord(filename, filePath, fileType, userEmail) {
    const stats = await fs.stat(filePath);
    const documentId = uuidv4();

    // First, get the user ID by email
    const userQuery = `SELECT id FROM users WHERE email = $1`;
    const userResult = await query(userQuery, [userEmail]);
    
    if (userResult.rows.length === 0) {
      throw new Error(`User with email ${userEmail} not found`);
    }
    
    const userId = userResult.rows[0].id;

    const insertQuery = `
      INSERT INTO documents (id, user_id, filename, original_filename, file_type, file_size, file_path, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    await run(insertQuery, [
      documentId,
      userId,
      path.basename(filePath),
      filename,
      fileType,
      stats.size,
      filePath,
      'uploaded'
    ]);

    return documentId;
  }

  async storeChunks(documentId, chunks) {
    const insertChunkQuery = `
      INSERT INTO document_chunks (document_id, chunk_index, content)
      VALUES ($1, $2, $3)
    `;

    for (let i = 0; i < chunks.length; i++) {
      await run(insertChunkQuery, [documentId, i, chunks[i]]);
    }
  }

  async getDocumentById(documentId) {
    const sql = `
      SELECT 
        d.*,
        COUNT(dc.id) as chunks_count
      FROM documents d
      LEFT JOIN document_chunks dc ON d.id = dc.document_id
      WHERE d.id = $1
      GROUP BY d.id
    `;

    const result = await query(sql, [documentId]);
    return result.rows && result.rows.length > 0 ? result.rows[0] : null;
  }

  async getDocumentsByUser(userEmail, limit = 50, offset = 0) {
    const sql = `
      SELECT 
        d.*,
        COUNT(dc.id) as chunks_count
      FROM documents d
      LEFT JOIN document_chunks dc ON d.id = dc.document_id
      JOIN users u ON d.user_id = u.id
      WHERE u.email = $1
      GROUP BY d.id
      ORDER BY d.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await query(sql, [userEmail, limit, offset]);
    return result.rows || [];
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
    await run('DELETE FROM documents WHERE id = $1', [documentId]);

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