import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock external services for testing
jest.mock('../services/setUpRedis.js', () => null);
jest.mock('../utils/logger.js', () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
  logInfo: jest.fn(),
  logHttp: jest.fn(),
  logDebug: jest.fn(),
}));

// Global test setup
beforeAll(async () => {
  // Setup code that runs before all tests
});

afterAll(async () => {
  // Cleanup code that runs after all tests
});

beforeEach(() => {
  // Setup code that runs before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup code that runs after each test
});