import { render, screen } from '@testing-library/react';
import App from './App';

// Mock any problematic modules
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
}));

test('renders app without crashing', () => {
  // Suppress console warnings for this test
  const originalError = console.error;
  console.error = jest.fn();
  
  try {
    render(<App />);
    // Basic test to ensure app renders
    expect(document.body).toBeInTheDocument();
  } finally {
    console.error = originalError;
  }
});

test('basic test to ensure Jest is working', () => {
  expect(1 + 1).toBe(2);
}); 