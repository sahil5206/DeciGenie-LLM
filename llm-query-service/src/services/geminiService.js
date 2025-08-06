const axios = require('axios');
const { query } = require('../config/database');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.model = 'gemini-pro';
    
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
  }

  async generateResponse(userQuery, context, documentChunks = []) {
    try {
      const startTime = Date.now();
      
      // Prepare the prompt with context and document chunks
      const prompt = this.buildPrompt(userQuery, context, documentChunks);
      
      const requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      const response = await axios.post(
        `${this.baseURL}/${this.model}:generateContent?key=${this.apiKey}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      const processingTime = Date.now() - startTime;
      
      if (!response.data.candidates || !response.data.candidates[0]) {
        throw new Error('No response generated from Gemini API');
      }

      const generatedText = response.data.candidates[0].content.parts[0].text;
      
      // Calculate confidence score based on response quality
      const confidenceScore = this.calculateConfidenceScore(generatedText, documentChunks);
      
      return {
        result_text: generatedText,
        confidence_score: confidenceScore,
        metadata: {
          model_used: this.model,
          processing_time: processingTime,
          documents_analyzed: documentChunks.length,
          chunks_retrieved: documentChunks.length,
          prompt_tokens: this.estimateTokenCount(prompt),
          response_tokens: this.estimateTokenCount(generatedText)
        }
      };

    } catch (error) {
      console.error('Gemini API error:', error.response?.data || error.message);
      throw new Error(`Failed to generate response: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  buildPrompt(userQuery, context, documentChunks) {
    let prompt = `You are DeciGenie LLM, an AI assistant specialized in analyzing insurance policies, contracts, and legal documents. 

Your task is to provide clear, accurate, and helpful answers based on the provided document content.

CONTEXT: ${context}

USER QUERY: ${userQuery}

`;

    if (documentChunks.length > 0) {
      prompt += `RELEVANT DOCUMENT CONTENT:
`;
      documentChunks.forEach((chunk, index) => {
        prompt += `[Document ${index + 1}]
${chunk.content}

`;
      });
    }

    prompt += `INSTRUCTIONS:
1. Analyze the user query carefully
2. Extract relevant information from the provided document content
3. Provide a clear, structured answer
4. If the information is not available in the documents, clearly state that
5. Include specific details like coverage amounts, exclusions, waiting periods, etc.
6. Format your response in a professional, easy-to-understand manner
7. If applicable, mention the source document for key information

Please provide your analysis:`;

    return prompt;
  }

  calculateConfidenceScore(generatedText, documentChunks) {
    let score = 0.5; // Base score
    
    // Increase score if response is substantial
    if (generatedText.length > 100) score += 0.1;
    if (generatedText.length > 300) score += 0.1;
    
    // Increase score if documents were provided
    if (documentChunks.length > 0) score += 0.2;
    if (documentChunks.length > 2) score += 0.1;
    
    // Increase score if response contains specific details
    if (generatedText.includes('coverage') || generatedText.includes('policy')) score += 0.05;
    if (generatedText.includes('exclusion') || generatedText.includes('waiting period')) score += 0.05;
    if (generatedText.includes('document') || generatedText.includes('source')) score += 0.05;
    
    // Decrease score if response is too generic
    if (generatedText.includes('I don\'t have enough information') || 
        generatedText.includes('not available in the documents')) {
      score -= 0.2;
    }
    
    return Math.min(Math.max(score, 0.1), 1.0); // Clamp between 0.1 and 1.0
  }

  estimateTokenCount(text) {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  async searchRelevantChunks(userQuery, limit = 5) {
    try {
      // Search for relevant document chunks using full-text search
      const searchQuery = `
        SELECT 
          dc.id,
          dc.document_id,
          dc.content,
          dc.chunk_index,
          d.original_filename as document_name,
          ts_rank(to_tsvector('english', dc.content), plainto_tsquery('english', $1)) as rank
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE to_tsvector('english', dc.content) @@ plainto_tsquery('english', $1)
        ORDER BY rank DESC
        LIMIT $2
      `;

      const result = await query(searchQuery, [userQuery, limit]);
      
      return result.rows.map(row => ({
        id: row.id,
        document_id: row.document_id,
        content: row.content,
        chunk_index: row.chunk_index,
        document_name: row.document_name,
        rank: row.rank
      }));

    } catch (error) {
      console.error('Error searching document chunks:', error);
      return [];
    }
  }
}

module.exports = new GeminiService(); 