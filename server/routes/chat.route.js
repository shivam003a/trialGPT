// Import necessary modules
import express from "express";
import {
    getAllChats,
    sendAuthenticatedMessage,
    sendMessage,
    sendMessageS,
} from "../controllers/chat.controller.js";
import { rateLimit } from "../middlewares/rateLimit.js";
import authenticateRequest from "../middlewares/authenticateReq.js";

// Create Express router
const router = express.Router();

// Define routes
router.post("/message", authenticateRequest, sendMessage);
router.post("/message/s", authenticateRequest, rateLimit("chat"), sendMessageS);
router.post("/chat", authenticateRequest, sendAuthenticatedMessage);
router.get("/chats", authenticateRequest, getAllChats);

export default router;
