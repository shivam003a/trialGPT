import express from "express";
import authenticateRequest from "../middlewares/authenticateReq.js";
import {
    getAuthUrl,
    getProfile,
    googleAuthCallback,
    logoutUser,
} from "../controllers/auth.controller.js";

// Create Express router
const router = express.Router();

// Define Routes
router.get("/google", getAuthUrl);
router.get("/google/callback", googleAuthCallback);
router.get("/me", authenticateRequest, getProfile);
router.post("/logout", logoutUser);

export default router;
