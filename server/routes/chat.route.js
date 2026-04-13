// Import necessary modules
import express from "express";
import { sendMessage, sendMessageS } from "../controllers/chat.controller.js";
import { rateLimit } from "../middlewares/rateLimit.js";

// Create Express router
const router = express.Router();

// Define routes
router.post("/message", sendMessage);
router.post("/message/s", rateLimit("chat"), sendMessageS);

export default router;
