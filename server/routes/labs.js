import express from 'express';
import { submitLab, getApprovedLabs, getLabById } from '../controllers/labController.js';
import { validateLabSubmission } from '../middleware/validation.js';
import { submitRateLimiter } from '../middleware/security.js';

const router = express.Router();

// Public routes
router.get('/', getApprovedLabs);
router.get('/:id', getLabById);

// Protected routes (with stricter rate limiting)
router.post('/submit', submitRateLimiter, validateLabSubmission, submitLab);

export default router;