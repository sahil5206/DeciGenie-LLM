const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { query, run } = require('../config/database');
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
      INSERT INTO queries (query_text, user_id, response_text, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `;
    
    const insertResult = await run(insertQuery, [userQuery, userId, 'Processing...']);

    // Generate response using Gemini (simplified for now)
    let response;
    try {
      response = await geminiService.generateResponse(userQuery, context, []);
    } catch (geminiError) {
      console.error('Gemini service error:', geminiError);
      response = {
        result_text: 'I apologize, but I encountered an error processing your query. Please try again.',
        confidence_score: 0.0,
        metadata: { error: 'gemini_service_error' }
      };
    }

    // Update query with response
    const updateQuery = `
      UPDATE queries 
      SET response_text = ?, updated_at = datetime('now')
      WHERE id = ?
    `;
    
    await run(updateQuery, [response.result_text, insertResult.id]);

    // Prepare response
    const result = {
      query_id: insertResult.id,
      result_text: response.result_text,
      confidence_score: response.confidence_score || 0.8,
      source_chunks: [],
      metadata: response.metadata || {}
    };

    res.status(201).json(result);

  } catch (error) {
    console.error('Query processing error:', error);
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
        id,
        query_text,
        response_text,
        created_at,
        updated_at
      FROM queries 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const result = await query(recentQueries, [userId, limit]);
    
    res.json({
      queries: result
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
        id,
        query_text,
        response_text,
        user_id,
        created_at,
        updated_at
      FROM queries 
      WHERE id = ?
    `;

    const result = await query(queryResult, [id]);
    
    if (result.length === 0) {
      return res.status(404).json({
        error: 'Query not found'
      });
    }

    const queryData = result[0];
    
    res.json({
      id: queryData.id,
      query_text: queryData.query_text,
      response_text: queryData.response_text,
      user_id: queryData.user_id,
      created_at: queryData.created_at,
      updated_at: queryData.updated_at
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
        COUNT(CASE WHEN response_text IS NOT NULL AND response_text != 'Processing...' THEN 1 END) as completed_queries,
        COUNT(CASE WHEN response_text = 'Processing...' THEN 1 END) as processing_queries,
        MAX(created_at) as last_query_time
      FROM queries 
      WHERE user_id = ?
    `;

    const result = await query(statsQuery, [userId]);
    
    res.json({
      stats: result[0] || {
        total_queries: 0,
        completed_queries: 0,
        processing_queries: 0,
        last_query_time: null
      }
    });

  } catch (error) {
    console.error('Error fetching query stats:', error);
    next(error);
  }
});

module.exports = router; 