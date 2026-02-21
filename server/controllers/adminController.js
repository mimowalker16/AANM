import database from '../database/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Get all pending labs (admin only)
export const getPendingLabs = asyncHandler(async (req, res) => {
    try {
        const labs = await database.getPendingLabs();
        
        res.json({
            success: true,
            message: 'Pending labs retrieved successfully',
            data: {
                labs,
                count: labs.length
            }
        });
    } catch (error) {
        throw error;
    }
});

// Approve a lab (admin only)
export const approveLab = asyncHandler(async (req, res) => {
    const labId = parseInt(req.params.id);
    const { adminNotes = null } = req.body;

    if (!labId || isNaN(labId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid lab ID'
        });
    }

    try {
        const result = await database.approveLab(labId, adminNotes);
        
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lab not found'
            });
        }

        res.json({
            success: true,
            message: 'Lab approved successfully',
            data: {
                labId,
                approvedAt: new Date().toISOString(),
                adminNotes
            }
        });
    } catch (error) {
        throw error;
    }
});

// Delete a lab (admin only)
export const deleteLab = asyncHandler(async (req, res) => {
    const labId = parseInt(req.params.id);

    if (!labId || isNaN(labId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid lab ID'
        });
    }

    try {
        const result = await database.deleteLab(labId);
        
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lab not found'
            });
        }

        res.json({
            success: true,
            message: 'Lab deleted successfully',
            data: {
                labId,
                deletedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        throw error;
    }
});

// Get admin statistics
export const getAdminStats = asyncHandler(async (req, res) => {
    // This would require additional database methods
    res.status(501).json({
        success: false,
        message: 'Admin statistics feature not implemented yet'
    });
});