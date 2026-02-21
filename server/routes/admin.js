import express from 'express';
import { getPendingLabs, approveLab, deleteLab, getAdminStats } from '../controllers/adminController.js';

const router = express.Router();

// Note: In production, these routes would be protected with authentication middleware
// For now, they are open but should be secured before deployment

router.get('/labs/pending', getPendingLabs);
router.put('/labs/:id/approve', approveLab);
router.delete('/labs/:id', deleteLab);
router.get('/stats', getAdminStats);

export default router;