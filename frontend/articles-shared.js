import DOMPurify from 'dompurify';

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const articleDate = value => value ? new Intl.DateTimeFormat('fr-DZ', { dateStyle: 'long', timeZone: 'Africa/Algiers' }).format(new Date(value)) : '';

export async function articleApi(path, { admin = false, method = 'GET', body, signal } = {}) {
    const headers = {};
    if (admin) headers.Authorization = `Bearer ${sessionStorage.getItem('adminToken') || ''}`;
    if (body && !(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
    const response = await fetch(`${window.AANM_API_BASE}/api/${admin ? 'admin/' : ''}articles${path}`, { method, headers, body, signal, cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
        const error = new Error(response.status === 401 || response.status === 403 ? 'Session expirée. Reconnectez-vous pour continuer.' : result.message || 'Le service est indisponible. Veuillez réessayer.');
        error.status = response.status;
        throw error;
    }
    return result.data;
}

export function articleMarkup(article) {
    return `<header class="article-heading"><p class="section-label">Actualités</p><h1>${escapeHtml(article.title)}</h1><p class="article-summary">${escapeHtml(article.summary)}</p><p class="article-meta">${escapeHtml(article.author)}${article.published_at ? ` · ${articleDate(article.published_at)}` : ''}</p></header>
        ${article.cover_url ? `<img class="article-cover" src="${escapeHtml(article.cover_url)}" alt="${escapeHtml(article.cover_alt)}">` : ''}
        <div class="article-body">${DOMPurify.sanitize(article.body_html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'iframe', 'form', 'input', 'button'], FORBID_ATTR: ['style', 'id'] })}</div>`;
}

export function showArticleError(element, error, retry) {
    element.replaceChildren();
    element.className = 'article-state';
    const message = document.createElement('p');
    message.textContent = error.message;
    element.append(message);
    if (retry) {
        const button = document.createElement('button');
        button.className = 'cms-button';
        button.textContent = 'Réessayer';
        button.addEventListener('click', retry);
        element.append(button);
    }
}
