import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function connectDB() {
  try {
    let uri = process.env.MONGO_URI;

    if (!uri) {
      const memServer = await MongoMemoryServer.create();
      uri = memServer.getUri();
      console.log('[DB] No MONGO_URI set — started in-memory MongoDB');
    }

    await mongoose.connect(uri);
    console.log('[DB] MongoDB connected');
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  }
}
