import { articleApi, escapeHtml, articleDate, showArticleError } from './articles-shared.js';
import './articles.css';

const list = document.getElementById('articlesList');
const state = document.getElementById('articlesState');
const pagination = document.getElementById('articlesPagination');
let page = Math.max(1, Number(new URLSearchParams(location.search).get('page')) || 1);

async function load() {
    list.replaceChildren(); pagination.replaceChildren(); state.hidden = false;
    state.textContent = 'Chargement des articles...';
    try {
        const data = await articleApi(`?page=${page}&limit=10`);
        if (!data.articles.length) {
            state.textContent = page === 1 ? 'Aucun article publié pour le moment.' : 'Aucun article sur cette page.';
        } else {
            state.hidden = true;
            list.innerHTML = data.articles.map((article, index) => {
                const featured = page === 1 && index === 0;
                const url = `./article.html?slug=${encodeURIComponent(article.slug)}`;
                return `<article class="article-card${featured ? ' article-card--featured' : ''}">
                    ${article.cover_url ? `<a href="${url}" tabindex="-1" aria-hidden="true"><img src="${escapeHtml(article.cover_url)}" alt="${escapeHtml(article.cover_alt)}" loading="${featured ? 'eager' : 'lazy'}"></a>` : ''}
                    <div class="article-card__content"><p class="article-meta">${featured ? 'À la une · ' : ''}${articleDate(article.published_at)}</p><h2><a href="${url}">${escapeHtml(article.title)}</a></h2><p>${escapeHtml(article.summary)}</p><a class="article-card__link" href="${url}">Lire l'article &rarr;</a></div></article>`;
            }).join('');
        }
        const pages = Math.max(1, Math.ceil(data.total / data.limit));
        if (pages > 1 || page > 1) {
            for (const [label, target, disabled] of [['Précédent', page - 1, page <= 1], ['Suivant', page + 1, page >= pages]]) {
                const button = document.createElement('button'); button.className = 'cms-button'; button.textContent = label; button.disabled = disabled;
                button.onclick = () => { page = target; history.replaceState(null, '', `?page=${page}`); load(); };
                pagination.append(button);
                if (label === 'Précédent') { const count = document.createElement('span'); count.textContent = `${page} / ${pages}`; pagination.append(count); }
            }
        }
    } catch (error) { showArticleError(state, error, load); }
}
load();
