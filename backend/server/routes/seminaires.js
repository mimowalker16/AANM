import express from 'express';
import multer from 'multer';
import {
	getSeminaires,
	getSeminaireById,
	getSeminaireQuestions,
	registerForSeminaire
} from '../controllers/seminaireController.js';
import { rateLimiter } from '../middleware/security.js';

const router = express.Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 100 * 1024 * 1024,
		files: 20
	}
});

router.get('/', getSeminaires);
router.get('/:id', getSeminaireById);
router.get('/:id/questions', getSeminaireQuestions);
router.post('/:id/register', rateLimiter, upload.any(), registerForSeminaire);

export default router;
