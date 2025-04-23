module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/backend/**/*.test.ts',
    '**/stuff/**/*.test.ts'
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
};
