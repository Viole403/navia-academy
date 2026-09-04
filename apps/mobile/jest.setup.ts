// expo-secure-store + expo-network mocked via moduleNameMapper in jest.config.js

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
}))

// Silence console noise during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
}
