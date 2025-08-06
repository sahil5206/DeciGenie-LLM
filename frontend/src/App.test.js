import { render, screen } from '@testing-library/react';
import App from './App';

test('renders without crashing', () => {
  render(<App />);
  // Basic test to ensure the app renders
  expect(document.body).toBeInTheDocument();
}); 