/**
 * MongoDB connection using Mongoose
 * Uses MONGODB_URI from environment
 */
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/teampulse';

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

export function isConnected() {
  return mongoose.connection.readyState === 1;
}

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(MONGODB_URI, options);
    console.log('[DB] MongoDB connected');
  } catch (err) {
    console.error('[DB] MongoDB connection failed:', err.message);
    throw err;
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  console.log('[DB] MongoDB disconnected');
}
