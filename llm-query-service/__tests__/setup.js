// Test setup file for LLM Query Service
process.env.NODE_ENV = 'test';
process.env.PORT = 3001;
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/decigenie_test';

// Mock environment variables that might not be available in test environment
process.env.GEMINI_API_KEY = 'test-api-key';
process.env.GEMINI_MODEL = 'gemini-pro';

// Increase timeout for tests
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Any global setup can go here
  console.log('Setting up test environment for LLM Query Service');
});

// Global test teardown
afterAll(async () => {
  // Any global cleanup can go here
  console.log('Cleaning up test environment for LLM Query Service');
}); 