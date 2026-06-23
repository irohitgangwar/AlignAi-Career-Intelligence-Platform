import mongoose from "mongoose";

let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing in backend/.env");
  }

  // Hinglish: ek hi baar MongoDB connection banana hai, baar baar reconnect nahi karna.
  await mongoose.connect(mongoUri);
  isConnected = true;
  return mongoose.connection;
}
