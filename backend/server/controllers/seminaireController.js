import database from '../database/index.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function isEmptyValue(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return !value.trim();
    if (Array.isArray(value)) return value.length === 0;
    return false;
}

function parseOptions(question) {
    if (!question.options_json) return [];
    if (Array.isArray(question.options_json)) return question.options_json;
    try {
        const parsed = JSON.parse(question.options_json);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function validateAnswer(question, rawValue) {
    const type = question.field_type;

    if (type === 'info_block') {
        return { ok: true, answerText: null, answerJson: null };
    }

    if (question.is_required && isEmptyValue(rawValue)) {
        return { ok: false, message: `La question "${question.label}" est obligatoire.` };
    }

    if (!question.is_required && isEmptyValue(rawValue)) {
        return { ok: true, answerText: null, answerJson: null };
    }

    if (type === 'email') {
        const value = normalizeString(rawValue).toLowerCase();
        if (!EMAIL_REGEX.test(value)) {
            return { ok: false, message: `Adresse e-mail invalide pour "${question.label}".` };
        }
        return { ok: true, answerText: value, answerJson: null };
    }

    if (type === 'phone') {
        const value = normalizeString(rawValue);
        if (!/^\+?[0-9\s\-().]{7,25}$/.test(value)) {
            return { ok: false, message: `Numéro de téléphone invalide pour "${question.label}".` };
        }
        return { ok: true, answerText: value, answerJson: null };
    }

    if (type === 'single_choice') {
        const value = normalizeString(rawValue);
        const options = parseOptions(question);
        if (options.length && !options.includes(value)) {
            return { ok: false, message: `Choix invalide pour "${question.label}".` };
        }
        return { ok: true, answerText: value, answerJson: null };
    }

    if (type === 'multiple_choice') {
        if (!Array.isArray(rawValue)) {
            return { ok: false, message: `Format invalide pour "${question.label}".` };
        }
        const normalized = rawValue.map((v) => normalizeString(v)).filter(Boolean);
        const options = parseOptions(question);
        if (options.length && normalized.some((v) => !options.includes(v))) {
            return { ok: false, message: `Un ou plusieurs choix sont invalides pour "${question.label}".` };
        }
        return { ok: true, answerText: null, answerJson: normalized };
    }

    if (type === 'file') {
        if (!Array.isArray(rawValue)) {
            return { ok: false, message: `Format de fichier invalide pour "${question.label}".` };
        }
        return { ok: true, answerText: null, answerJson: rawValue };
    }

    // text / textarea
    return { ok: true, answerText: normalizeString(rawValue), answerJson: null };
}

function buildRawAnswersMap(body) {
    const fromArray = Array.isArray(body.answers)
        ? body.answers
              .filter((item) => item && item.question_id)
              .reduce((acc, item) => {
                  acc[String(item.question_id)] = item.value;
                  return acc;
              }, {})
        : {};

    if (Object.keys(fromArray).length) {
        return fromArray;
    }

    // Legacy fallback mapping while frontend migrates
    return {
        full_name: body.full_name,
        nom_prenom: body.full_name,
        nom_complet: body.full_name,
        email: body.email,
        phone: body.phone
    };
}

function resolveCandidateValue(question, rawAnswers) {
    const byId = rawAnswers[String(question.id)];
    if (byId !== undefined) return byId;

    const byKey = rawAnswers[question.question_key];
    if (byKey !== undefined) return byKey;

    if (question.field_type === 'email' && rawAnswers.email !== undefined) {
        return rawAnswers.email;
    }

    if (question.field_type === 'phone' && rawAnswers.phone !== undefined) {
        return rawAnswers.phone;
    }

    if ((question.question_key === 'full_name' || question.question_key === 'nom_prenom' || question.question_key === 'nom_complet')
        && rawAnswers.full_name !== undefined) {
        return rawAnswers.full_name;
    }

    return undefined;
}

export async function getSeminaires(req, res) {
    try {
        const seminaires = await database.getSeminaires();
        res.json({ success: true, data: seminaires });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}

export async function getSeminaireById(req, res) {
    try {
        const seminar = await database.getSeminaireById(req.params.id);
        if (!seminar) return res.status(404).json({ success: false, message: 'Séminaire introuvable.' });
        res.json({ success: true, data: seminar });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}

export async function getSeminaireQuestions(req, res) {
    try {
        const seminar = await database.getSeminaireById(req.params.id);
        if (!seminar) return res.status(404).json({ success: false, message: 'Séminaire introuvable.' });
        const questions = await database.getSeminaireQuestions(req.params.id);
        res.json({ success: true, data: questions });
    } catch {
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}

export async function registerForSeminaire(req, res) {
    try {
        const seminar = await database.getSeminaireById(req.params.id);
        if (!seminar) return res.status(404).json({ success: false, message: 'Séminaire introuvable.' });

        if (!seminar.is_open) {
            return res.status(403).json({ success: false, message: 'Les inscriptions pour ce séminaire sont fermées.' });
        }

        if (seminar.capacity !== null && seminar.total_registration_count >= seminar.capacity) {
            return res.status(403).json({ success: false, message: 'Ce séminaire est complet.' });
        }

        const questions = await database.getSeminaireQuestions(req.params.id);
        if (!questions.length) {
            return res.status(400).json({
                success: false,
                message: "Aucune question d'inscription n'est configurée pour ce séminaire."
            });
        }

        const rawAnswers = buildRawAnswersMap(req.body);
        const validatedAnswers = [];
        let emailValue = null;

        for (const question of questions) {
            const candidateValue = resolveCandidateValue(question, rawAnswers);
            const validated = validateAnswer(question, candidateValue);
            if (!validated.ok) {
                return res.status(400).json({ success: false, message: validated.message });
            }

            if (question.field_type === 'email' && validated.answerText) {
                emailValue = validated.answerText;
            }

            if (validated.answerText !== null || validated.answerJson !== null) {
                validatedAnswers.push({
                    question_id: question.id,
                    answer_text: validated.answerText,
                    answer_json: validated.answerJson
                });
            }
        }

        if (!emailValue) {
            return res.status(400).json({
                success: false,
                message: "Une question de type e-mail est requise pour finaliser l'inscription."
            });
        }

        const alreadyRegistered = await database.hasSeminarRegistrationByEmail(req.params.id, emailValue);
        if (alreadyRegistered) {
            return res.status(409).json({ success: false, message: 'Cette adresse email est déjà inscrite à ce séminaire.' });
        }

        await database.createDynamicRegistration(req.params.id, validatedAnswers, []);
        res.status(201).json({
            success: true,
            message: "Votre demande d'inscription a été enregistrée. Elle sera confirmée après vérification du paiement."
        });
    } catch {
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}
