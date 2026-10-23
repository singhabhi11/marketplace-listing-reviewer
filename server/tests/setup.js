import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach } from 'vitest';

process.env.MONGOMS_SYSTEM_BINARY = 'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-vitest-auth-testing-32chars';
process.env.LLM_PROVIDER = 'mock';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      storageEngine: 'ephemeralForTest',
    },
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
  });
}, 30000);

afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (err) {
    // Ignore disconnect error during teardown
  }
  if (mongoServer) {
    await mongoServer.stop({ force: true });
  }
}, 30000);

beforeEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});
