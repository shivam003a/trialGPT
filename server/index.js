// Import necessary modules
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";

import responseHandler from "./middlewares/responseHandler.js";
import chatRoutes from "./routes/chat.route.js";

// Load environment variables and initialize Express app
dotenv.config();

const app = express();
const PORT = parseInt(process?.env?.PORT, 10) || 5000;

app.set("trust proxy", true);

// Configure middlewares
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    cors({
        origin: process?.env?.FE_URL || "http://localhost:5000",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        credentials: true,
    }),
);
app.use(morgan("short"));
app.use(responseHandler);

// Define routes
app.get("/", (_, res) => {
    return res.success(200, "welcome to the home route", null);
});

app.use("/api/chat", chatRoutes);

// 404 Not Found handler
app.use((req, res) => {
    return res.error(404, "not found");
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
