import { validationResult } from 'express-validator';
import database from '../database/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Submit new lab
export const submitLab = asyncHandler(async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    const {
        labName,
        institutionName = null,
        contactPerson,
        contactEmail,
        phone = null,
        website = null,
        description = null,
        establishedYear = null,
        researchAreas,
        location
    } = req.body;

    // Prepare data for database
    const labData = {
        lab_name: labName,
        institution_name: institutionName,
        contact_person: contactPerson,
        contact_email: contactEmail,
        phone,
        website,
        address: location.address,
        city: location.city,
        country: location.country,
        coordinates_lat: location.lat,
        coordinates_lng: location.lng,
        research_areas: JSON.stringify(researchAreas),
        description,
        established_year: establishedYear
    };

    try {
        const result = await database.createLab(labData);
        
        res.status(201).json({
            success: true,
            message: 'Lab information submitted successfully',
            data: {
                id: result.id,
                submittedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        throw error;
    }
});

// Get all approved labs
export const getApprovedLabs = asyncHandler(async (req, res) => {
    try {
        const labs = await database.getApprovedLabs();
        
        res.json({
            success: true,
            message: 'Labs retrieved successfully',
            data: {
                labs,
                count: labs.length
            }
        });
    } catch (error) {
        throw error;
    }
});

// Get single lab by ID
export const getLabById = asyncHandler(async (req, res) => {
    const labId = parseInt(req.params.id);
    
    if (!labId || isNaN(labId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid lab ID'
        });
    }

    // This would need to be implemented in database module
    res.status(501).json({
        success: false,
        message: 'Feature not implemented yet'
    });
});