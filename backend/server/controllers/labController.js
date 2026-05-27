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

// Get all approved labs with enhanced search and filtering
export const getLabs = asyncHandler(async (req, res) => {
    try {
        const searchParams = {
            search: req.query.search,
            country: req.query.country,
            city: req.query.city,
            institution: req.query.institution,
            researchArea: req.query.researchArea,
            yearFrom: req.query.yearFrom,
            yearTo: req.query.yearTo,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder,
            limit: req.query.limit,
            offset: req.query.offset
        };

        // Remove undefined values
        Object.keys(searchParams).forEach(key => {
            if (searchParams[key] === undefined) {
                delete searchParams[key];
            }
        });

        const labs = await database.getApprovedLabs(searchParams);
        
        res.json({
            success: true,
            message: 'Labs retrieved successfully',
            data: {
                labs,
                count: labs.length,
                searchParams: searchParams
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

    try {
        const lab = await database.getLabById(labId);
        
        if (!lab) {
            return res.status(404).json({
                success: false,
                message: 'Laboratory not found or not approved'
            });
        }

        res.json({
            success: true,
            message: 'Laboratory retrieved successfully',
            data: {
                lab
            }
        });
    } catch (error) {
        throw error;
    }
});

// Get search suggestions for autocomplete
export const getSearchSuggestions = asyncHandler(async (req, res) => {
    const { field, query, limit } = req.query;
    
    if (!field || !query) {
        return res.status(400).json({
            success: false,
            message: 'Field and query parameters are required'
        });
    }

    try {
        const suggestions = await database.getSearchSuggestions(field, query, limit);
        
        res.json({
            success: true,
            message: 'Search suggestions retrieved successfully',
            data: {
                suggestions,
                field,
                query
            }
        });
    } catch (error) {
        throw error;
    }
});

// Get search statistics
export const getSearchStats = asyncHandler(async (req, res) => {
    try {
        const stats = await database.getSearchStats();
        
        res.json({
            success: true,
            message: 'Search statistics retrieved successfully',
            data: stats
        });
    } catch (error) {
        throw error;
    }
});