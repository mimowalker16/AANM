import express from 'express';
import { getPendingLabs, approveLab, deleteLab, getAdminStats } from '../controllers/adminController.js';
import { requireAdminAuth, createAdminToken } from '../middleware/auth.js';
import { loginRateLimiter } from '../middleware/security.js';
import {
    adminGetSeminaires, adminCreateSeminaire, adminUpdateSeminaire,
    adminToggleSeminaire, adminDeleteSeminaire,
    adminGetRegistrations, adminDeleteRegistration
} from '../controllers/adminSeminaireController.js';

const router = express.Router();

// ─── Public: Admin Login ────────────────────────────────────────────────────
router.post('/login', loginRateLimiter, (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required.' });
    }

    const token = createAdminToken(username, password);

    if (!token) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    res.json({ success: true, token, message: 'Login successful.' });
});

// ─── Protected: Admin Operations ────────────────────────────────────────────
router.get('/labs/pending', requireAdminAuth, getPendingLabs);
router.put('/labs/:id/approve', requireAdminAuth, approveLab);
router.delete('/labs/:id', requireAdminAuth, deleteLab);
router.get('/stats', requireAdminAuth, getAdminStats);

// ─── Protected: Seminaire Management ────────────────────────────────────────
router.get('/seminaires', requireAdminAuth, adminGetSeminaires);
router.post('/seminaires', requireAdminAuth, adminCreateSeminaire);
router.put('/seminaires/:id', requireAdminAuth, adminUpdateSeminaire);
router.put('/seminaires/:id/toggle', requireAdminAuth, adminToggleSeminaire);
router.delete('/seminaires/:id', requireAdminAuth, adminDeleteSeminaire);
router.get('/seminaires/:id/registrations', requireAdminAuth, adminGetRegistrations);
router.delete('/registrations/:id', requireAdminAuth, adminDeleteRegistration);

export default router;
