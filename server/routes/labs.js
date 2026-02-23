import express from 'express';
import { submitLab, getLabs, getLabById, getSearchSuggestions, getSearchStats } from '../controllers/labController.js';
import { validateLabSubmission } from '../middleware/validation.js';
import { submitRateLimiter } from '../middleware/security.js';

const router = express.Router();

// Public routes
router.get('/', getLabs);
router.get('/suggestions', getSearchSuggestions);
router.get('/stats', getSearchStats);
router.get('/:id', getLabById);

// Protected routes (with stricter rate limiting)
router.post('/submit', submitRateLimiter, validateLabSubmission, submitLab);

export default router;