// Test setup file for Document Ingestion Service
process.env.NODE_ENV = 'test';
process.env.PORT = 3002;
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/decigenie_test';

// Mock environment variables that might not be available in test environment
process.env.UPLOAD_DIR = '/tmp/uploads';
process.env.MAX_FILE_SIZE = '10485760'; // 10MB

// Increase timeout for tests
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Any global setup can go here
  console.log('Setting up test environment for Document Ingestion Service');
});

// Global test teardown
afterAll(async () => {
  // Any global cleanup can go here
  console.log('Cleaning up test environment for Document Ingestion Service');
}); 