import sanitizeHtml from 'sanitize-html';
import sharp from 'sharp';
import { config } from '../config/index.js';

export class ArticleError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}

export function isArticleImage(url) {
    if (!url || !config.supabase.url) return false;
    const prefix = `${config.supabase.url}/storage/v1/object/public/${encodeURIComponent(config.supabase.articleMediaBucket)}/`;
    return url.startsWith(prefix) && /^[a-f0-9-]+\.(jpg|png|webp)$/.test(url.slice(prefix.length));
}

export function sanitizeArticle(html) {
    return sanitizeHtml(html, {
        allowedTags: ['p', 'br', 'h2', 'h3', 'strong', 'em', 's', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'hr'],
        allowedAttributes: { a: ['href', 'rel'], img: ['src', 'alt', 'loading'] },
        allowedSchemes: ['https', 'http', 'mailto'],
        allowProtocolRelative: false,
        transformTags: {
            a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
            img: sanitizeHtml.simpleTransform('img', { loading: 'lazy' })
        },
        exclusiveFilter: frame => frame.tag === 'img' && !isArticleImage(frame.attribs.src)
    });
}

export function articleInput(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ArticleError(400, 'Article invalide.');
    const limits = { title: 200, summary: 600, author: 120, cover_url: 2048, cover_alt: 300, body_html: 200000 };
    const result = {};
    for (const [key, limit] of Object.entries(limits)) {
        const value = body[key] ?? (key === 'author' ? 'AANM' : '');
        if (typeof value !== 'string' || value.length > limit) throw new ArticleError(400, `Champ invalide : ${key} (maximum ${limit} caractères).`);
        result[key] = value.trim();
    }
    if (!result.title) throw new ArticleError(400, 'Le titre est obligatoire.');
    if (result.cover_url && !isArticleImage(result.cover_url)) throw new ArticleError(400, 'Image de couverture invalide.');
    result.body_html = sanitizeArticle(result.body_html);
    return result;
}

export function requirePublishable(article) {
    const text = sanitizeHtml(article.body_html, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;/g, ' ').trim();
    if (!article.title || !article.summary || !article.author || !text) {
        throw new ArticleError(400, 'Ajoutez un titre, un résumé, un auteur et du contenu avant de publier.');
    }
    if (article.cover_url && !article.cover_alt) throw new ArticleError(400, "Décrivez l'image de couverture avant de publier.");
}

export async function prepareArticleImage(file) {
    if (!file) throw new ArticleError(400, 'Sélectionnez une image.');
    if (file.size > 5 * 1024 * 1024) throw new ArticleError(413, "L'image dépasse 5 Mo.");
    try {
        const input = sharp(file.buffer, { limitInputPixels: 40000000, animated: false, failOn: 'warning' });
        const metadata = await input.metadata();
        if (!['jpeg', 'png', 'webp'].includes(metadata.format)) throw new Error('Unsupported format');
        // Decode and re-encode to verify the file and remove metadata or appended payloads.
        const buffer = await input.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
        return { buffer, contentType: 'image/webp', extension: 'webp' };
    } catch {
        throw new ArticleError(400, 'Image invalide. Formats acceptés : JPEG, PNG et WebP.');
    }
}
