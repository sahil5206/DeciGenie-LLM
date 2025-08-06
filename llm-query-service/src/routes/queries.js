const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const geminiService = require('../services/geminiService');

const router = express.Router();

// Validation middleware
const validateQuery = [
  body('query')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Query must be between 1 and 1000 characters'),
  body('context')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Context must be less than 500 characters')
];

// Create a new query
router.post('/', validateQuery, async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { query: userQuery, context = 'General document query' } = req.body;
    const userId = req.body.user_id || 'test@example.com'; // Default user for demo

    // Create query record
    const queryId = uuidv4();
    const insertQuery = `
      INSERT INTO queries (id, user_id, query_text, context, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    await query(insertQuery, [queryId, userId, userQuery, context, 'processing']);

    // Search for relevant document chunks
    const relevantChunks = await geminiService.searchRelevantChunks(userQuery, 5);

    // Generate response using Gemini
    const response = await geminiService.generateResponse(userQuery, context, relevantChunks);

    // Update query status to completed
    await query(
      'UPDATE queries SET status = $1 WHERE id = $2',
      ['completed', queryId]
    );

    // Store query results
    const resultId = uuidv4();
    const insertResult = `
      INSERT INTO query_results (id, query_id, result_text, confidence_score, source_chunks, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await query(insertResult, [
      resultId,
      queryId,
      response.result_text,
      response.confidence_score,
      JSON.stringify(relevantChunks),
      JSON.stringify(response.metadata)
    ]);

    // Prepare response with source information
    const result = {
      query_id: queryId,
      result_text: response.result_text,
      confidence_score: response.confidence_score,
      source_chunks: relevantChunks.map(chunk => ({
        content: chunk.content,
        document_name: chunk.document_name,
        chunk_index: chunk.chunk_index
      })),
      metadata: response.metadata
    };

    res.status(201).json(result);

  } catch (error) {
    console.error('Query processing error:', error);
    
    // Update query status to failed if query was created
    if (req.body.query) {
      try {
        await query(
          'UPDATE queries SET status = $1 WHERE query_text = $2 AND status = $3',
          ['failed', req.body.query, 'processing']
        );
      } catch (updateError) {
        console.error('Failed to update query status:', updateError);
      }
    }

    next(error);
  }
});

// Get recent queries
router.get('/recent', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.query.user_id || 'test@example.com';

    const recentQueries = `
      SELECT 
        q.id,
        q.query_text,
        q.status,
        q.created_at,
        qr.confidence_score
      FROM queries q
      LEFT JOIN query_results qr ON q.id = qr.query_id
      WHERE q.user_id = $1
      ORDER BY q.created_at DESC
      LIMIT $2
    `;

    const result = await query(recentQueries, [userId, limit]);
    
    res.json({
      queries: result.rows
    });

  } catch (error) {
    console.error('Error fetching recent queries:', error);
    next(error);
  }
});

// Get query by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const queryResult = `
      SELECT 
        q.id,
        q.query_text,
        q.context,
        q.status,
        q.created_at,
        qr.result_text,
        qr.confidence_score,
        qr.source_chunks,
        qr.metadata
      FROM queries q
      LEFT JOIN query_results qr ON q.id = qr.query_id
      WHERE q.id = $1
    `;

    const result = await query(queryResult, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Query not found'
      });
    }

    const queryData = result.rows[0];
    
    res.json({
      id: queryData.id,
      query_text: queryData.query_text,
      context: queryData.context,
      status: queryData.status,
      created_at: queryData.created_at,
      result: queryData.result_text ? {
        result_text: queryData.result_text,
        confidence_score: queryData.confidence_score,
        source_chunks: queryData.source_chunks,
        metadata: queryData.metadata
      } : null
    });

  } catch (error) {
    console.error('Error fetching query:', error);
    next(error);
  }
});

// Get query statistics
router.get('/stats/summary', async (req, res, next) => {
  try {
    const userId = req.query.user_id || 'test@example.com';

    const statsQuery = `
      SELECT 
        COUNT(*) as total_queries,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_queries,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_queries,
        AVG(CASE WHEN qr.confidence_score IS NOT NULL THEN qr.confidence_score END) as avg_confidence,
        MAX(created_at) as last_query_time
      FROM queries q
      LEFT JOIN query_results qr ON q.id = qr.query_id
      WHERE q.user_id = $1
    `;

    const result = await query(statsQuery, [userId]);
    
    res.json({
      stats: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching query stats:', error);
    next(error);
  }
});

module.exports = router; 