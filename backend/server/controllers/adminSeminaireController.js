import database from '../database/index.js';
import emailService from '../services/emailService.js';

function normalizeSeminairePayload(body) {
    const deliveryMode = body.delivery_mode === 'virtual' ? 'virtual' : 'in_person';
    const capacity = body.capacity === '' || body.capacity === undefined || body.capacity === null
        ? null
        : Number(body.capacity);

    return {
        title: body.title,
        date: body.date,
        location: body.location || null,
        delivery_mode: deliveryMode,
        virtual_room_url: deliveryMode === 'virtual' ? body.virtual_room_url || null : null,
        description: body.description || null,
        capacity
    };
}

function validateSeminairePayload(payload) {
    if (!payload.title || !payload.date) {
        return 'Titre et date requis.';
    }

    if (payload.delivery_mode === 'virtual' && !payload.virtual_room_url) {
        return 'Le lien de la salle virtuelle est requis pour un séminaire virtuel.';
    }

    if (payload.delivery_mode === 'in_person' && !payload.location) {
        return 'Le lieu est requis pour un séminaire en présentiel.';
    }

    if (payload.capacity !== null && (!Number.isInteger(payload.capacity) || payload.capacity < 1)) {
        return 'La capacité doit être un nombre entier positif.';
    }

    return null;
}

export async function adminGetSeminaires(req, res) {
    try {
        const seminaires = await database.getSeminaires();
        res.json({ success: true, data: seminaires });
    } catch (err) {
        console.error('Failed to load seminaires:', err);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}

export async function adminCreateSeminaire(req, res) {
    const payload = normalizeSeminairePayload(req.body);
    const validationError = validateSeminairePayload(payload);
    if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
    }
    try {
        const result = await database.createSeminaire({ ...payload, is_open: true });
        res.status(201).json({ success: true, id: result.id });
    } catch (err) {
        console.error('Failed to create seminaire:', {
            message: err.message,
            code: err.code,
            detail: err.detail,
            column: err.column,
            table: err.table
        });
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}

export async function adminUpdateSeminaire(req, res) {
    const payload = normalizeSeminairePayload(req.body);
    const validationError = validateSeminairePayload(payload);
    if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
    }
    try {
        const result = await database.updateSeminaire(req.params.id, payload);
        if (!result.changes) return res.status(404).json({ success: false, message: 'Séminaire introuvable.' });
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to update seminaire:', {
            id: req.params.id,
            message: err.message,
            code: err.code,
            detail: err.detail,
            column: err.column,
            table: err.table
        });
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}

export async function adminToggleSeminaire(req, res) {
    try {
        const result = await database.toggleSeminaireOpen(req.params.id);
        if (!result.changes) return res.status(404).json({ success: false, message: 'Séminaire introuvable.' });
        const updated = await database.getSeminaireById(req.params.id);
        res.json({ success: true, is_open: updated.is_open });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}

export async function adminDeleteSeminaire(req, res) {
    try {
        const result = await database.deleteSeminaire(req.params.id);
        if (!result.changes) return res.status(404).json({ success: false, message: 'Séminaire introuvable.' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}

export async function adminGetRegistrations(req, res) {
    try {
        const seminar = await database.getSeminaireById(req.params.id);
        if (!seminar) return res.status(404).json({ success: false, message: 'Séminaire introuvable.' });
        const registrations = await database.getRegistrationsBySeminar(req.params.id);
        res.json({ success: true, data: registrations, seminar });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}

export async function adminDeleteRegistration(req, res) {
    try {
        const result = await database.deleteRegistration(req.params.id);
        if (!result.changes) return res.status(404).json({ success: false, message: 'Inscription introuvable.' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}

export async function adminApproveRegistration(req, res) {
    try {
        const approved = await database.approveRegistration(req.params.id);
        if (!approved) return res.status(404).json({ success: false, message: 'Inscription introuvable.' });

        const registration = await database.getRegistrationWithSeminar(req.params.id);
        let emailStatus = { sent: false, skipped: true, reason: 'Email non envoyé' };

        try {
            emailStatus = await emailService.sendSeminarApprovalEmail(registration);
            if (emailStatus.sent) {
                await database.markRegistrationEmailSent(req.params.id);
            } else {
                await database.markRegistrationEmailError(req.params.id, emailStatus.reason);
            }
        } catch (emailError) {
            await database.markRegistrationEmailError(req.params.id, emailError.message);
            emailStatus = {
                sent: false,
                skipped: false,
                reason: emailError.message
            };
        }

        const updatedRegistration = await database.getRegistrationWithSeminar(req.params.id);
        res.json({
            success: true,
            data: updatedRegistration,
            emailSent: emailStatus.sent,
            emailSkipped: emailStatus.skipped,
            emailMessage: emailStatus.sent
                ? 'Email de confirmation envoyé.'
                : emailStatus.reason || "L'inscription a été approuvée, mais l'email n'a pas été envoyé."
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}
