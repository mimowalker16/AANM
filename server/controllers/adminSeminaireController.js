import database from '../database/index.js';

export async function adminGetSeminaires(req, res) {
    try {
        const seminaires = await database.getSeminaires();
        res.json({ success: true, data: seminaires });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}

export async function adminCreateSeminaire(req, res) {
    const { title, date, location, description, capacity } = req.body;
    if (!title || !date) {
        return res.status(400).json({ success: false, message: 'Titre et date requis.' });
    }
    try {
        const result = await database.createSeminaire({ title, date, location, description, capacity, is_open: 1 });
        res.status(201).json({ success: true, id: result.id });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}

export async function adminUpdateSeminaire(req, res) {
    const { title, date, location, description, capacity } = req.body;
    if (!title || !date) {
        return res.status(400).json({ success: false, message: 'Titre et date requis.' });
    }
    try {
        const result = await database.updateSeminaire(req.params.id, { title, date, location, description, capacity });
        if (!result.changes) return res.status(404).json({ success: false, message: 'Séminaire introuvable.' });
        res.json({ success: true });
    } catch (err) {
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
