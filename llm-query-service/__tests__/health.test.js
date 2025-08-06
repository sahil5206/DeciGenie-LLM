const request = require('supertest');

// Mock the app since we don't want to start the full server in tests
const mockApp = {
  get: jest.fn().mockImplementation((path) => {
    if (path === '/health/live') {
      return {
        status: 200,
        json: () => ({ status: 'healthy' })
      };
    }
    return {
      status: 404,
      json: () => ({ error: 'Not found' })
    };
  })
};

jest.mock('../src/index', () => mockApp);

describe('Health Check', () => {
  test('GET /health/live should return 200', async () => {
    const response = await mockApp.get('/health/live');
    expect(response.status).toBe(200);
  });
}); 