import database from '../database/index.js';

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

export async function registerForSeminaire(req, res) {
    const { full_name, email, phone } = req.body;

    if (!full_name || !email) {
        return res.status(400).json({ success: false, message: 'Nom complet et email requis.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Adresse email invalide.' });
    }

    try {
        const seminar = await database.getSeminaireById(req.params.id);
        if (!seminar) return res.status(404).json({ success: false, message: 'Séminaire introuvable.' });

        if (!seminar.is_open) {
            return res.status(403).json({ success: false, message: 'Les inscriptions pour ce séminaire sont fermées.' });
        }

        if (seminar.capacity !== null && seminar.total_registration_count >= seminar.capacity) {
            return res.status(403).json({ success: false, message: 'Ce séminaire est complet.' });
        }

        await database.createRegistration(req.params.id, { full_name, email, phone });
        res.status(201).json({
            success: true,
            message: "Votre demande d'inscription a été enregistrée. Elle sera confirmée après vérification du paiement."
        });
    } catch (err) {
        if (err.duplicate) {
            return res.status(409).json({ success: false, message: 'Cette adresse email est déjà inscrite à ce séminaire.' });
        }
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
}
