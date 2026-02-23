import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';

/**
 * Middleware: verify JWT token for protected admin routes
 */
export function requireAdminAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, config.auth.jwtSecret);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Forbidden. Admin access only.' });
        }
        req.admin = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
}

/**
 * Validate admin credentials and return a signed JWT
 */
export function createAdminToken(username, password) {
    const validUsername = username === config.auth.adminUsername;
    // Compare plaintext password (stored in env — bcrypt hash optional upgrade later)
    const validPassword = password === config.auth.adminPassword;

    if (!validUsername || !validPassword) {
        return null;
    }

    return jwt.sign(
        { sub: username, role: 'admin' },
        config.auth.jwtSecret,
        { expiresIn: config.auth.jwtExpiresIn }
    );
}
