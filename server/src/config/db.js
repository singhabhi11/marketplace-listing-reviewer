import mongoose from 'mongoose';
import { config } from './config.js';

let isConnected = false;

export const connectDB = async (customUri = null) => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = customUri || config.mongodbUri;

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
