import { body } from 'express-validator';

export const validateLabSubmission = [
    body('labName')
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Lab name must be between 2 and 200 characters'),
    
    body('contactPerson')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Contact person name must be between 2 and 100 characters'),
    
    body('contactEmail')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    
    body('phone')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Phone number too long'),
    
    body('website')
        .optional()
        .isURL()
        .withMessage('Please provide a valid website URL'),
    
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description must not exceed 1000 characters'),
    
    body('institutionName')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Institution name too long'),
    
    body('establishedYear')
        .optional()
        .isInt({ min: 1800, max: 2026 })
        .withMessage('Please provide a valid year'),
    
    body('researchAreas')
        .isArray({ min: 1 })
        .withMessage('Please select at least one research area'),
    
    body('location.lat')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Invalid latitude'),
    
    body('location.lng')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Invalid longitude'),
    
    body('location.address')
        .trim()
        .isLength({ min: 5, max: 500 })
        .withMessage('Address must be between 5 and 500 characters'),
    
    body('location.city')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('City is required'),
    
    body('location.country')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Country is required')
];