// config/db.js

import mongoose from "mongoose";

// NOTE: We assume dotenv is called in your server.js to load environment variables.

export const connectDB = async () => {
    // ⚠️ CRITICAL: Ensure MONGO_URI is defined in your backend/.env file 
    //    and contains your username, password, and cluster URL.

    if (!process.env.MONGO_URI) {
        console.error("FATAL ERROR: MONGO_URI is not defined in .env file.");
        process.exit(1);
    }
    
    try {
        // Use the URI loaded from the environment variable
        await mongoose.connect(process.env.MONGO_URI);
        console.log('DB CONNECTED');
    } catch (err) {
        console.error('DB CONNECTION ERROR:', err);
        process.exit(1); // Exit process if DB connection fails
    }
}