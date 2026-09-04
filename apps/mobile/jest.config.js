/** @type {import('jest').Config} */
module.exports = {
  preset: undefined,
  testEnvironment: "node",
  transform: {
    "\\.[jt]sx?$": [
      "babel-jest",
      {
        presets: [["babel-preset-expo", { jsxImportSource: "react" }]],
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|expo|@expo|expo-modules-core|expo-secure-store|expo-network|@react-native-async-storage)/)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^expo-secure-store$": "<rootDir>/src/utils/__mocks__/expo-secure-store.js",
    "^expo-network$": "<rootDir>/src/utils/__mocks__/expo-network.js",
    "^expo$": "<rootDir>/src/utils/__mocks__/expo.js",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/android/", "/ios/"],
  clearMocks: true,
  resetModules: true,
}
