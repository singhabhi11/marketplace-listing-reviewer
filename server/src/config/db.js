import mongoose from 'mongoose';
import { config } from './config.js';

let isConnected = false;

export const connectDB = async (customUri = null) => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = customUri || config.mongodbUri;

  if (uri.includes('127.0.0.1') || uri.includes('localhost')) {
    if (process.env.RENDER || config.nodeEnv === 'production') {
      console.warn(
        '\n[DB Warning] You are running in cloud hosting, but MONGODB_URI is pointing to localhost (127.0.0.1).\n' +
        'Render cloud servers do not run a local MongoDB instance.\n' +
        '-> Go to Render Dashboard -> Your Web Service -> Environment tab -> Add MONGODB_URI with your MongoDB Atlas URL.\n'
      );
    }
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });
    isConnected = true;
    console.log(`[DB] Connected to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    console.error(`[DB] MongoDB Connection Error: ${error.message}`);
    // Do not crash the entire process immediately in dev so health checks can report DB status
    if (config.nodeEnv === 'production') {
      throw error;
    }
    return null;
  }
};

export const disconnectDB = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[DB] Disconnected from MongoDB');
  }
};
