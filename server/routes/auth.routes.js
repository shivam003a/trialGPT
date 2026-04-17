import express from "express";
import { getAuthUrl, getCodes } from "../controllers/auth.controller.js";

// Create Express router
const router = express.Router();

// Define Routes
router.get("/google", getAuthUrl);
router.get("/google/callback", getCodes);

export default router;
