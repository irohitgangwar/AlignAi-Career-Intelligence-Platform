import mongoose from "mongoose";

let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    console.log("♻️ Using existing MongoDB connection");
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

    console.log("✅ MongoDB Atlas Connected");
    console.log("Database:", mongoose.connection.name);

    return mongoose.connection;
  } catch (error) {
    console.error("❌ MongoDB Connection Failed");
    console.error(error);
    throw error;
  }
}