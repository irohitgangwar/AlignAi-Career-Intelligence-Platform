import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    logger.info("♻️ Using existing MongoDB connection");
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing in backend/.env");
  }

  try {
    //ek hi baar mongodb connection bnana hai baar baar connect nhi karna
    await mongoose.connect(mongoUri);

    isConnected = true;

    logger.info("✅ MongoDB Atlas Connected", { database: mongoose.connection.name });

    return mongoose.connection;
  } catch (error) {
    logger.error("❌ MongoDB Connection Failed", error);
    throw error;
  }
}