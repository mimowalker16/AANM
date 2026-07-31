import { body } from 'express-validator';

const QUALIFICATION_OPTIONS = [
    'nutritherapeute',
    'medecin-generaliste',
    'medecin-specialiste',
    'pharmacien',
    'biologiste',
    'chirurgien-dentiste',
    'naturopathe',
    'phytotherapeute',
    'sage-femme',
    'autre'
];

const PRACTICE_OPTIONS = [
    'hidjama',
    'mesotherapie',
    'nutritherapie',
    'auriculotherapie',
    'naturotherapie',
    'phytotherapie',
    'ozonotherapie',
    'autre'
];

function containsOnlyAllowed(value, allowed) {
    return Array.isArray(value) && value.every((item) => allowed.includes(item));
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

function splitPhoneList(value) {
    return String(value || '')
        .split(/[,;/\n\r]+/)
        .map((item) => item.trim())
        .filter(Boolean);
}

export const validateLabSubmission = [
    body('fullName')
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Nom complet requis (2 à 200 caractères)'),

    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Adresse e-mail invalide'),

    body('wilaya')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Wilaya requise'),

    body('telephones')
        .trim()
        .isLength({ min: 6, max: 60 })
        .withMessage('Téléphone requis (6 à 60 caractères)')
        .custom((value) => {
            const phones = splitPhoneList(value);
            if (!phones.length || phones.some((phone) => !isValidAlgerianPhone(phone))) {
                throw new Error('Ajoutez un numéro algérien valide, ex. 0551 23 45 67 ou +213 551 23 45 67');
            }
            return true;
        }),

    body('address')
        .trim()
        .isLength({ min: 5, max: 500 })
        .withMessage('Adresse requise (5 à 500 caractères)'),

    body('comments')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Commentaires trop longs'),

    body('qualifications')
        .isArray({ min: 1 })
        .custom((value) => containsOnlyAllowed(value, QUALIFICATION_OPTIONS))
        .custom((value, { req }) => {
            if (value.includes('medecin-specialiste') && !String(req.body.specialistSpecialty || '').trim()) {
                throw new Error('Précisez la spécialité');
            }
            if (value.includes('autre') && !String(req.body.qualificationOther || '').trim()) {
                throw new Error('Précisez l’autre qualification');
            }
            return true;
        })
        .withMessage('Sélectionnez au moins une fonction/qualification valide'),

    body('specialistSpecialty')
        .optional()
        .trim()
        .isLength({ max: 150 })
        .withMessage('Spécialité trop longue'),

    body('qualificationOther')
        .optional()
        .trim()
        .isLength({ max: 150 })
        .withMessage('Autre qualification trop longue'),

    body('practices')
        .isArray({ min: 1 })
        .custom((value) => containsOnlyAllowed(value, PRACTICE_OPTIONS))
        .custom((value, { req }) => {
            if (value.includes('autre') && !String(req.body.practiceOther || '').trim()) {
                throw new Error('Précisez l’autre pratique');
            }
            return true;
        })
        .withMessage('Sélectionnez au moins une pratique valide'),

    body('practiceOther')
        .optional()
        .trim()
        .isLength({ max: 150 })
        .withMessage('Autre pratique trop longue'),

    body('location.lat')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude invalide'),

    body('location.lng')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude invalide'),

    body('location.address')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Adresse de géolocalisation trop longue'),

    body('location.city')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Ville de géolocalisation trop longue'),

    body('location.country')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Pays de géolocalisation trop long')
];
