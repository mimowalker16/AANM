import emailService from '../services/emailService.js';

export function adminGetEmailStatus(req, res) {
    res.json({
        success: true,
        data: emailService.getStatus()
    });
}

export async function adminSendTestEmail(req, res) {
    try {
        const result = await emailService.sendTestEmail(req.body?.to);
        res.status(result.sent ? 200 : 400).json({
            success: result.sent,
            emailSent: result.sent,
            emailSkipped: result.skipped,
            emailErrorCode: result.code || null,
            message: result.sent
                ? 'Email de test envoyé.'
                : result.reason || "L'email de test n'a pas pu être envoyé."
        });
    } catch (err) {
        console.error('Failed to send admin test email:', err);
        res.status(500).json({
            success: false,
            emailSent: false,
            emailErrorCode: err.code || null,
            message: "L'email de test n'a pas pu être envoyé."
        });
    }
}
