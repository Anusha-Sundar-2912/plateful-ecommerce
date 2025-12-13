// config/db.js
import mongoose from "mongoose";

export const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not defined.");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB CONNECTED");
  } catch (err) {
    console.error("DB CONNECTION ERROR:", err.message);
  }
};
