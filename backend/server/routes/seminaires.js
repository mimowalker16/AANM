import express from 'express';
import {
	getSeminaires,
	getSeminaireById,
	getSeminaireQuestions,
	registerForSeminaire
} from '../controllers/seminaireController.js';
import { rateLimiter } from '../middleware/security.js';

const router = express.Router();

router.get('/', getSeminaires);
router.get('/:id', getSeminaireById);
router.get('/:id/questions', getSeminaireQuestions);
router.post('/:id/register', rateLimiter, registerForSeminaire);

export default router;
