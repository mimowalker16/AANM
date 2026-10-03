import { articleApi, articleMarkup, showArticleError } from './articles-shared.js';
import './articles.css';

const content = document.getElementById('articleContent');
async function load() {
    content.className = '';
    content.textContent = "Chargement de l'article...";
    const slug = new URLSearchParams(location.search).get('slug');
    if (!slug) { showArticleError(content, new Error('Article introuvable.')); return; }
    try {
        const { article } = await articleApi(`/${encodeURIComponent(slug)}`);
        document.title = `${article.title} - AANM`;
        document.querySelector('meta[name="description"]').content = article.summary;
        content.innerHTML = articleMarkup(article);
    } catch (error) { showArticleError(content, error, error.status === 404 ? null : load); }
}
load();
