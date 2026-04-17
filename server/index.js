// Import ENV first
import dotenv from "dotenv";
dotenv.config();

// Imports
import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";

import responseHandler from "./middlewares/responseHandler.js";
import chatRoutes from "./routes/chat.route.js";
import authRoutes from "./routes/auth.routes.js";
import { connectRedis, disconnectRedis } from "./utils/redis.js";
import connectDB from "./config/db.js";

connectDB();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.set("trust proxy", true);

// Global Middlewares
app.use(helmet());
app.use(
    cors({
        origin: process.env.FE_URL || "http://localhost:5000",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        credentials: true,
    }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));
app.use(responseHandler);

// Routes
app.get("/", (_, res) => {
    return res.success(200, "welcome to API", null);
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// 404 Not Found handler
app.use((req, res) => {
    return res.error(404, "not found");
});

// Start the server
const server = app.listen(PORT, async () => {
    await connectRedis();
    console.log(`Server is running at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
    console.log("Shutting down server...");
    server.close(async () => {
        await disconnectRedis();
        process.exit(0);
    });
});
