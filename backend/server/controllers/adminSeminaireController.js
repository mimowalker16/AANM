import database from '../database/index.js';
import emailService from '../services/emailService.js';

const QUESTION_TYPES = new Set([
    'text',
    'email',
    'phone',
    'textarea',
    'single_choice',
    'multiple_choice',
    'file',
    'info_block'
]);

function slugifyQuestionKey(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 64);
}

function normalizeQuestionPayload(body) {
    const fieldType = QUESTION_TYPES.has(body.field_type) ? body.field_type : 'text';
    const questionKey = slugifyQuestionKey(body.question_key || body.label);
    const maxFiles = body.max_files === undefined || body.max_files === null || body.max_files === ''
        ? 1
        : Number(body.max_files);
    const maxFileSizeMb = body.max_file_size_mb === undefined || body.max_file_size_mb === null || body.max_file_size_mb === ''
        ? 100
        : Number(body.max_file_size_mb);

    return {
        question_key: questionKey,
        label: String(body.label || '').trim(),
        description: body.description ? String(body.description).trim() : null,
        field_type: fieldType,
        is_required: Boolean(body.is_required),
        sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
        is_active: body.is_active === undefined ? true : Boolean(body.is_active),
        placeholder: body.placeholder ? String(body.placeholder).trim() : null,
        help_text: body.help_text ? String(body.help_text).trim() : null,
        options_json: Array.isArray(body.options) ? body.options : body.options_json || null,
        validation_json: body.validation_json || null,
        allow_multiple_files: Boolean(body.allow_multiple_files),
        max_files: Number.isFinite(maxFiles) ? maxFiles : 1,
        max_file_size_mb: Number.isFinite(maxFileSizeMb) ? maxFileSizeMb : 100,
        allowed_mime_types_json: Array.isArray(body.allowed_mime_types)
            ? body.allowed_mime_types
            : body.allowed_mime_types_json || null
    };
}

function validateQuestionPayload(payload) {
    if (!payload.question_key) {
        return 'question_key invalide.';
    }
    if (!payload.label && payload.field_type !== 'info_block') {
        return 'Le libellé de la question est requis.';
    }
    if (!QUESTION_TYPES.has(payload.field_type)) {
        return 'Type de question invalide.';
    }
    if (payload.max_files < 1 || payload.max_files > 5) {
        return 'max_files doit être entre 1 et 5.';
    }
    if (payload.max_file_size_mb < 1 || payload.max_file_size_mb > 100) {
        return 'max_file_size_mb doit être entre 1 et 100.';
    }
    return null;
}

function normalizeSeminairePayload(body) {
    const deliveryMode = body.delivery_mode === 'virtual' ? 'virtual' : 'in_person';
    const capacity = body.capacity === '' || body.capacity === undefined || body.capacity === null
        ? null
        : Number(body.capacity);
    const questions = Array.isArray(body.questions)
        ? body.questions.map((question, index) => normalizeQuestionPayload({
            ...question,
            sort_order: index
        }))
        : null;

    return {
        title: body.title,
        date: body.date,
        location: body.location || null,
        delivery_mode: deliveryMode,
        virtual_room_url: deliveryMode === 'virtual' ? body.virtual_room_url || null : null,
        description: body.description || null,
        capacity,
        questions
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

    if (payload.questions !== null) {
        if (!payload.questions.length) {
            return "Ajoutez au moins une question d'inscription.";
        }

        for (const question of payload.questions) {
            const questionError = validateQuestionPayload(question);
            if (questionError) return questionError;
            if ((question.field_type === 'single_choice' || question.field_type === 'multiple_choice')
                && (!Array.isArray(question.options_json) || question.options_json.length < 1)) {
                return `Ajoutez au moins une option pour "${question.label}".`;
            }
        }

        const hasEmail = payload.questions.some((question) => question.field_type === 'email');
        const hasFullName = payload.questions.some((question) => question.question_key === 'full_name'
            || question.question_key === 'nom_prenom'
            || question.question_key === 'nom_complet');
        if (!hasEmail || !hasFullName) {
            return 'Les questions doivent inclure au moins NOM PRENOM et une adresse e-mail.';
        }
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
        const { questions, ...seminairePayload } = payload;
        const result = await database.createSeminaire({ ...seminairePayload, is_open: true });
        if (questions) {
            await database.replaceSeminaireQuestions(result.id, questions);
        } else {
            await database.seedDefaultSeminaireQuestions(result.id);
        }
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
        const { questions, ...seminairePayload } = payload;
        const result = await database.updateSeminaire(req.params.id, seminairePayload);
        if (!result.changes) return res.status(404).json({ success: false, message: 'Séminaire introuvable.' });
        if (questions) {
            await database.replaceSeminaireQuestions(req.params.id, questions);
        }
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

export async function adminGetSeminaireQuestions(req, res) {
    try {
        const seminar = await database.getSeminaireById(req.params.id);
        if (!seminar) return res.status(404).json({ success: false, message: 'Séminaire introuvable.' });
        const questions = await database.getSeminaireQuestions(req.params.id, true);
        res.json({ success: true, data: questions });
    } catch {
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}

export async function adminCreateSeminaireQuestion(req, res) {
    const payload = normalizeQuestionPayload(req.body);
    const validationError = validateQuestionPayload(payload);
    if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
    }

    try {
        const seminar = await database.getSeminaireById(req.params.id);
        if (!seminar) return res.status(404).json({ success: false, message: 'Séminaire introuvable.' });
        const question = await database.createSeminaireQuestion(req.params.id, payload);
        res.status(201).json({ success: true, data: question });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ success: false, message: 'question_key déjà utilisée pour ce séminaire.' });
        }
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}

export async function adminUpdateSeminaireQuestion(req, res) {
    const payload = normalizeQuestionPayload(req.body);
    const validationError = validateQuestionPayload(payload);
    if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
    }

    try {
        const question = await database.updateSeminaireQuestion(req.params.id, req.params.questionId, payload);
        if (!question) return res.status(404).json({ success: false, message: 'Question introuvable.' });
        res.json({ success: true, data: question });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ success: false, message: 'question_key déjà utilisée pour ce séminaire.' });
        }
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}

export async function adminReorderSeminaireQuestions(req, res) {
    const order = Array.isArray(req.body.order) ? req.body.order : [];
    if (!order.length) {
        return res.status(400).json({ success: false, message: 'Ordre invalide.' });
    }

    try {
        await database.reorderSeminaireQuestions(req.params.id, order);
        const questions = await database.getSeminaireQuestions(req.params.id, true);
        res.json({ success: true, data: questions });
    } catch {
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}

export async function adminDeleteSeminaireQuestion(req, res) {
    try {
        const result = await database.deactivateSeminaireQuestion(req.params.id, req.params.questionId);
        if (!result.changes) return res.status(404).json({ success: false, message: 'Question introuvable.' });
        res.json({ success: true });
    } catch {
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
            emailErrorCode: emailStatus.code || null,
            emailMessage: emailStatus.sent
                ? 'Email de confirmation envoyé.'
                : emailStatus.reason || "L'inscription a été approuvée, mais l'email n'a pas été envoyé."
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}
