// Import necessary modules
import express from 'express';
import {sendMessage} from '../controllers/chat.controller.js';

// Create Express router
const router = express.Router();

// Define routes
router.post('/message', sendMessage);

export default router;