import database from '../database/index.js';
import supabaseStorageService from '../services/supabaseStorageService.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FILE_FIELD_PREFIX = 'file_';

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

function parseJsonField(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function isValidAlgerianPhone(value) {
    const normalized = String(value || '')
        .trim()
        .replace(/[()\s.-]/g, '')
        .replace(/^00/, '+');

    if (!normalized) return false;

    let significantNumber = normalized;
    if (significantNumber.startsWith('+213')) {
        significantNumber = significantNumber.slice(4);
    } else if (significantNumber.startsWith('213')) {
        significantNumber = significantNumber.slice(3);
    } else if (significantNumber.startsWith('0')) {
        significantNumber = significantNumber.slice(1);
    }

    return /^([567]\d{8}|[234]\d{7})$/.test(significantNumber);
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
        if (!isValidAlgerianPhone(value)) {
            return { ok: false, message: `Numéro algérien invalide pour "${question.label}".` };
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
    const answers = parseJsonField(body.answers, body.answers);
    const fromArray = Array.isArray(answers)
        ? answers
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

function filesByQuestionId(files = []) {
    return files.reduce((acc, file) => {
        if (!file.fieldname?.startsWith(FILE_FIELD_PREFIX)) return acc;
        const questionId = file.fieldname.slice(FILE_FIELD_PREFIX.length);
        if (!questionId) return acc;
        acc[questionId] = acc[questionId] || [];
        acc[questionId].push(file);
        return acc;
    }, {});
}

function safeFileName(value) {
    return String(value || 'file')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 120) || 'file';
}

function safePathPart(value) {
    return String(value || 'unknown')
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80) || 'unknown';
}

function validateQuestionFiles(question, files) {
    if (question.field_type !== 'file') return { ok: true };

    const maxFiles = Number(question.max_files || 1);
    const maxBytes = Number(question.max_file_size_mb || 100) * 1024 * 1024;
    const allowedMimeTypes = Array.isArray(question.allowed_mime_types_json)
        ? question.allowed_mime_types_json
        : parseJsonField(question.allowed_mime_types_json, []);

    if (question.is_required && files.length === 0) {
        return { ok: false, message: `La question "${question.label}" est obligatoire.` };
    }

    if (files.length > maxFiles) {
        return { ok: false, message: `Trop de fichiers pour "${question.label}" (${maxFiles} maximum).` };
    }

    if (files.some((file) => file.size > maxBytes)) {
        return { ok: false, message: `Un fichier dépasse la taille maximale pour "${question.label}".` };
    }

    if (allowedMimeTypes.length && files.some((file) => !allowedMimeTypes.includes(file.mimetype))) {
        return { ok: false, message: `Type de fichier invalide pour "${question.label}".` };
    }

    return { ok: true };
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
        const uploadedFilesByQuestion = filesByQuestionId(req.files || []);
        const validatedAnswers = [];
        const fileUploads = [];
        let emailValue = null;
        let fullNameValue = null;
        let phoneValue = null;

        for (const question of questions) {
            const questionFiles = uploadedFilesByQuestion[String(question.id)] || [];
            if (question.field_type === 'file') {
                const fileValidation = validateQuestionFiles(question, questionFiles);
                if (!fileValidation.ok) {
                    return res.status(400).json({ success: false, message: fileValidation.message });
                }
            }

            const candidateValue = question.field_type === 'file'
                ? questionFiles.map((file) => ({
                    name: file.originalname,
                    size: file.size,
                    type: file.mimetype
                }))
                : resolveCandidateValue(question, rawAnswers);
            const validated = validateAnswer(question, candidateValue);
            if (!validated.ok) {
                return res.status(400).json({ success: false, message: validated.message });
            }

            if (question.field_type === 'email' && validated.answerText) {
                emailValue = validated.answerText;
            }
            if ((question.question_key === 'full_name' || question.question_key === 'nom_prenom' || question.question_key === 'nom_complet') && validated.answerText) {
                fullNameValue = validated.answerText;
            }
            if (question.field_type === 'phone' && validated.answerText) {
                phoneValue = validated.answerText;
            }

            if (validated.answerText !== null || validated.answerJson !== null) {
                validatedAnswers.push({
                    question_id: question.id,
                    question_key: question.question_key,
                    label: question.label,
                    field_type: question.field_type,
                    answer_text: validated.answerText,
                    answer_json: validated.answerJson
                });
            }

            if (question.field_type === 'file' && questionFiles.length) {
                fileUploads.push({ question, files: questionFiles });
            }
        }

        if (!emailValue) {
            return res.status(400).json({
                success: false,
                message: "Une question de type e-mail est requise pour finaliser l'inscription."
            });
        }
        if (!fullNameValue) {
            return res.status(400).json({
                success: false,
                message: "Une question NOM PRENOM est requise pour finaliser l'inscription."
            });
        }

        const alreadyRegistered = await database.hasSeminarRegistrationByEmail(req.params.id, emailValue);
        if (alreadyRegistered) {
            return res.status(409).json({ success: false, message: 'Cette adresse email est déjà inscrite à ce séminaire.' });
        }

        const storedFiles = [];
        const timestamp = Date.now();
        for (const uploadGroup of fileUploads) {
            for (let i = 0; i < uploadGroup.files.length; i += 1) {
                const file = uploadGroup.files[i];
                const storagePath = [
                    `seminar-${req.params.id}`,
                    safePathPart(emailValue),
                    `${timestamp}-${uploadGroup.question.id}-${i + 1}-${safeFileName(file.originalname)}`
                ].join('/');

                const stored = await supabaseStorageService.uploadBuffer(
                    storagePath,
                    file.buffer,
                    file.mimetype
                );

                const fileRecord = {
                    question_id: uploadGroup.question.id,
                    question_key: uploadGroup.question.question_key,
                    label: uploadGroup.question.label,
                    storage_bucket: stored.bucket,
                    storage_path: stored.path,
                    original_name: file.originalname,
                    mime_type: file.mimetype,
                    size_bytes: file.size
                };

                storedFiles.push(fileRecord);
            }
        }

        for (const answer of validatedAnswers) {
            if (answer.field_type !== 'file') continue;
            const matchingFiles = storedFiles
                .filter((file) => file.question_id === answer.question_id)
                .map((file) => ({
                    name: file.original_name,
                    size: file.size_bytes,
                    type: file.mime_type,
                    bucket: file.storage_bucket,
                    path: file.storage_path
                }));
            answer.answer_json = matchingFiles;
        }

        await database.createDynamicRegistration(
            req.params.id,
            { full_name: fullNameValue, email: emailValue, phone: phoneValue },
            validatedAnswers,
            storedFiles
        );
        res.status(201).json({
            success: true,
            message: "Votre demande d'inscription a été enregistrée. Elle sera confirmée après vérification du paiement."
        });
    } catch (err) {
        console.error('Failed to register for seminaire:', err);
        if (err.message?.includes('Supabase Storage is not configured')) {
            return res.status(503).json({
                success: false,
                message: "Le stockage des reçus n'est pas configuré. Ajoutez SUPABASE_SERVICE_ROLE_KEY côté serveur."
            });
        }
        if (err.message?.startsWith('Supabase upload failed')) {
            return res.status(502).json({
                success: false,
                message: "Le reçu n'a pas pu être envoyé vers Supabase Storage. Vérifiez la clé service_role et le bucket."
            });
        }
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}
