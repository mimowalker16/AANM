import express from 'express';
import { getSeminaires, getSeminaireById, registerForSeminaire } from '../controllers/seminaireController.js';
import { rateLimiter } from '../middleware/security.js';

const router = express.Router();

router.get('/', getSeminaires);
router.get('/:id', getSeminaireById);
router.post('/:id/register', rateLimiter, registerForSeminaire);

export default router;
