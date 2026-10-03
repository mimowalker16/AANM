import { createIcons, Pencil, Plus, ChevronLeft, ChevronRight } from 'lucide';
import { articleApi, articleDate, escapeHtml, showArticleError } from './articles-shared.js';
import './articles.css';

const panel = document.getElementById('articlesTab');
panel.innerHTML = `<div class="cms"><div class="cms-toolbar"><div class="cms-filters"><input id="articleSearch" type="search" maxlength="200" aria-label="Rechercher un article" placeholder="Rechercher un article"><select id="articleStatus" aria-label="État des articles"><option value="">Tous les articles</option><option value="draft">Brouillons</option><option value="published">Publiés</option></select></div><a class="cms-button cms-button--primary" href="./admin-article-edit.html"><i data-lucide="plus"></i>Nouvel article</a></div><div id="adminArticleState" class="article-state" role="status"></div><div class="cms-table-wrap"><table class="cms-table" id="adminArticleTable" hidden><thead><tr><th>Titre</th><th>État</th><th>Publication</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody id="adminArticleRows"></tbody></table></div><div id="adminArticlePagination" class="cms-pagination"></div></div>`;
const icons = () => createIcons({ icons: { Pencil, Plus, ChevronLeft, ChevronRight }, root: panel });
const state = document.getElementById('adminArticleState');
const table = document.getElementById('adminArticleTable');
const search = document.getElementById('articleSearch');
const status = document.getElementById('articleStatus');
const pagination = document.getElementById('adminArticlePagination');
let page = 1;
let request;
async function load() {
    request?.abort(); request = new AbortController();
    state.hidden = false; state.textContent = 'Chargement des articles...'; table.hidden = true; pagination.replaceChildren();
    try {
        const params = new URLSearchParams({ page, limit: 15, search: search.value, status: status.value });
        const data = await articleApi(`?${params}`, { admin: true, signal: request.signal });
        if (!data.articles.length) { state.textContent = 'Aucun article trouvé.'; }
        else {
            state.hidden = true; table.hidden = false;
            document.getElementById('adminArticleRows').innerHTML = data.articles.map(a => `<tr><td><a href="./admin-article-edit.html?id=${a.id}">${escapeHtml(a.title)}</a></td><td><span class="cms-status${a.status === 'published' ? ' cms-status--published' : ''}">${a.status === 'published' ? 'Publié' : 'Brouillon'}</span></td><td>${articleDate(a.published_at) || 'Non publié'}</td><td><a class="cms-button" href="./admin-article-edit.html?id=${a.id}" aria-label="Modifier ${escapeHtml(a.title)}" title="Modifier"><i data-lucide="pencil"></i></a></td></tr>`).join('');
        }
        const pages = Math.max(1, Math.ceil(data.total / data.limit));
        if (pages > 1 || page > 1) {
            pagination.innerHTML = `<button class="cms-button" id="articlePrev" title="Page précédente" aria-label="Page précédente" ${page <= 1 ? 'disabled' : ''}><i data-lucide="chevron-left"></i></button><span>${page} / ${pages}</span><button class="cms-button" id="articleNext" title="Page suivante" aria-label="Page suivante" ${page >= pages ? 'disabled' : ''}><i data-lucide="chevron-right"></i></button>`;
            document.getElementById('articlePrev').onclick = () => { page--; load(); };
            document.getElementById('articleNext').onclick = () => { page++; load(); };
        }
        icons();
    } catch (error) {
        if ([401, 403].includes(error.status)) {
            sessionStorage.removeItem('adminToken');
            location.replace('./admin-login.html');
        } else if (error.name !== 'AbortError') showArticleError(state, error, load);
    }
}
let debounce;
search.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => { page = 1; load(); }, 250); });
status.addEventListener('change', () => { page = 1; load(); });
document.querySelector('[data-tab="articles"]').addEventListener('click', load);
icons();
document.addEventListener('DOMContentLoaded', () => {
    if (location.hash === '#articles') document.querySelector('[data-tab="articles"]').click();
});
