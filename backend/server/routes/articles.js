import express from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import database from '../database/index.js';
import { ArticleRepository } from '../database/articles.js';
import { ArticleError, articleInput, prepareArticleImage } from '../services/articleContent.js';
import storage from '../services/supabaseStorageService.js';
import { config } from '../config/index.js';
import { requireAdminAuth } from '../middleware/auth.js';

const handle = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

export function createArticleRouter({ admin = false, repository = () => new ArticleRepository(database.pool), uploadImage } = {}) {
    const router = express.Router();
    router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
    if (admin) router.use(requireAdminAuth);
    router.get('/', handle(async (req, res) => {
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 10);
        const search = req.query.search ?? '';
        const status = req.query.status ?? '';
        if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50 || typeof search !== 'string' || search.length > 200 || !['', 'draft', 'published'].includes(status)) throw new ArticleError(400, 'Filtres invalides.');
        res.json({ success: true, data: await repository().list({ page, limit, search: admin ? search : '', status, admin }) });
    }));
    if (admin) {
        const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 } });
        router.post('/images', upload.single('image'), handle(async (req, res) => {
            const image = await prepareArticleImage(req.file);
            const path = `${randomUUID()}.${image.extension}`;
            let url;
            try {
                if (uploadImage) url = await uploadImage(path, image);
                else {
                    await storage.uploadBuffer(path, image.buffer, image.contentType, config.supabase.articleMediaBucket);
                    url = `${config.supabase.url}/storage/v1/object/public/${encodeURIComponent(config.supabase.articleMediaBucket)}/${path}`;
                }
            } catch { throw new ArticleError(503, "Le stockage des images est indisponible. Réessayez plus tard."); }
            res.status(201).json({ success: true, data: { url } });
        }));
        router.post('/', handle(async (req, res) => res.status(201).json({ success: true, data: { article: await repository().create(articleInput(req.body)) } })));
        router.param('id', (req, res, next, id) => {
            if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)) return next(new ArticleError(400, 'Identifiant invalide.'));
            next();
        });
        router.get('/:id', handle(async (req, res) => res.json({ success: true, data: { article: await repository().get(req.params.id, true) } })));
        router.put('/:id', handle(async (req, res) => res.json({ success: true, data: { article: await repository().change(req.params.id, 'update', articleInput(req.body)) } })));
        for (const action of ['publish', 'unpublish']) {
            router.post(`/:id/${action}`, handle(async (req, res) => res.json({ success: true, data: { article: await repository().change(req.params.id, action) } })));
        }
        router.delete('/:id', handle(async (req, res) => { await repository().change(req.params.id, 'delete'); res.json({ success: true }); }));
    } else {
        router.get('/:slug', handle(async (req, res) => res.json({ success: true, data: { article: await repository().get(req.params.slug) } })));
    }
    router.use((error, req, res, next) => {
        if (error instanceof ArticleError) return res.status(error.status).json({ success: false, message: error.message });
        if (error instanceof multer.MulterError) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ success: false, message: 'Envoyez une seule image JPEG, PNG ou WebP de 5 Mo maximum.' });
        next(error);
    });
    return router;
}

export default createArticleRouter();
