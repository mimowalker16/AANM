import { randomUUID } from 'node:crypto';
import { ArticleError, requirePublishable } from '../services/articleContent.js';

const summaryColumns = 'id, slug, title, summary, author, cover_url, cover_alt, status, created_at, updated_at, published_at';
const fields = ['title', 'summary', 'author', 'cover_url', 'cover_alt', 'body_html'];

export class ArticleRepository {
    constructor(pool) { this.pool = pool; }

    async list({ page = 1, limit = 10, search = '', status = '', admin = false } = {}) {
        const values = [];
        const conditions = [];
        if (!admin || status) { values.push(admin ? status : 'published'); conditions.push(`status = $${values.length}`); }
        if (search) { values.push(`%${search.replace(/[\\%_]/g, '\\$&')}%`); conditions.push(`title ILIKE $${values.length}`); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const count = await this.pool.query(`SELECT COUNT(*)::int AS total FROM public.articles ${where}`, values);
        const order = admin ? 'updated_at DESC, id DESC' : 'published_at DESC, id DESC';
        const rows = await this.pool.query(`SELECT ${summaryColumns} FROM public.articles ${where} ORDER BY ${order} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, limit, (page - 1) * limit]);
        return { articles: rows.rows, total: count.rows[0].total, page, limit };
    }

    async get(value, admin = false) {
        const { rows } = await this.pool.query(`SELECT * FROM public.articles WHERE ${admin ? 'id' : 'slug'} = $1 ${admin ? '' : "AND status = 'published'"}`, [value]);
        if (!rows[0]) throw new ArticleError(404, 'Article introuvable.');
        return rows[0];
    }

    async create(input) {
        const base = input.title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) || 'article';
        for (let attempt = 0; attempt < 3; attempt++) {
            const id = randomUUID();
            const slug = `${base}-${id.slice(0, 8)}`;
            const { rows } = await this.pool.query(`INSERT INTO public.articles (id, slug, ${fields.join(', ')}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (slug) DO NOTHING RETURNING *`, [id, slug, ...fields.map(f => input[f])]);
            if (rows[0]) return rows[0];
        }
        throw new ArticleError(409, 'Veuillez réessayer la création de cet article.');
    }

    async change(id, action, input) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query('SELECT * FROM public.articles WHERE id = $1 FOR UPDATE', [id]);
            const article = rows[0];
            if (!article) throw new ArticleError(404, 'Article introuvable.');
            let result;
            if (action === 'delete') {
                if (article.status === 'published') throw new ArticleError(409, "Retirez l'article de la publication avant de le supprimer.");
                await client.query('DELETE FROM public.articles WHERE id = $1', [id]);
                result = null;
            } else if (action === 'update') {
                if (article.status === 'published') requirePublishable(input);
                result = await client.query(`UPDATE public.articles SET ${fields.map((f, i) => `${f} = $${i + 2}`).join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`, [id, ...fields.map(f => input[f])]);
            } else if (action === 'publish') {
                requirePublishable(article);
                result = await client.query("UPDATE public.articles SET status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW() WHERE id = $1 RETURNING *", [id]);
            } else {
                result = await client.query("UPDATE public.articles SET status = 'draft', updated_at = NOW() WHERE id = $1 RETURNING *", [id]);
            }
            await client.query('COMMIT');
            return result?.rows[0] ?? null;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally { client.release(); }
    }
}
