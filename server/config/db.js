import mongoose from "mongoose";

const connectDB = async () => {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
        console.error("missing required environment variable MONGODB_URI");
        process.exit(1);
    }

    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            dbName: "trialGPT",
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error("❌ MongoDB Connection Failed: ", err.message);

        process.exit(1);
    }
};

export default connectDB;
