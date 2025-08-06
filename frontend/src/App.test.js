// Simple test to ensure Jest is working
test('basic test', () => {
  expect(1 + 1).toBe(2);
});

test('environment is working', () => {
  expect(process.env.NODE_ENV).toBeDefined();
}); 