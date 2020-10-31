module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	verbose: true,
	rootDir: 'src/',
	globalSetup: '../node_modules/@shelf/jest-dynamodb/setup.js',
	globalTeardown: '../node_modules/@shelf/jest-dynamodb/teardown.js'
};

process.env.DYNAMODB_TABLE = 'casheye-dynamodb-test';
process.env.STAGE = 'test';
