import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) throw new Error("MONGODB_URI not set");

// Cache connection across hot reloads in dev
const globalWithMongoose = global as typeof global & {
  _mongooseConn?: typeof mongoose;
  _mongoosePromise?: Promise<typeof mongoose>;
};

let cached = globalWithMongoose._mongoosePromise;

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  
  if (!cached) {
    console.log('Connecting to MongoDB...');
    cached = mongoose.connect(MONGODB_URI);
    globalWithMongoose._mongoosePromise = cached;
    
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected successfully');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
  }
  
  await cached;
}
