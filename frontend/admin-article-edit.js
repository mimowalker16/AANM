import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { createIcons, Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link, Unlink, ImagePlus, Undo2, Redo2, Eye, Save, Send, Trash2, ImageOff } from 'lucide';
import { articleApi, articleMarkup, articleDate } from './articles-shared.js';
import './articles.css';

if (!sessionStorage.getItem('adminToken')) location.replace('./admin-login.html');
const $ = id => document.getElementById(id);
const icons = { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link, Unlink, ImagePlus, Undo2, Redo2, Eye, Save, Send, Trash2, ImageOff };
let article = { status: 'draft' };
let id = new URLSearchParams(location.search).get('id');
let coverUrl = '';
let dirty = false;
let busy = false;
let ready = !id;
let preview = false;
const form = $('articleForm');
const message = (text, error = false) => { $('editorMessage').textContent = text; $('editorMessage').dataset.error = String(error); };
const markDirty = event => {
    event?.target?.setCustomValidity?.('');
    event?.target?.removeAttribute?.('aria-invalid');
    dirty = true;
    message('Modifications non enregistrées.');
};

const editor = new Editor({
    element: $('bodyEditor'),
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, code: false, codeBlock: false, underline: false, link: { openOnClick: false, autolink: false, defaultProtocol: 'https' } }), Image.configure({ allowBase64: false })],
    editorProps: { attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-labelledby': 'bodyLabel' } },
    onUpdate: markDirty,
    onSelectionUpdate: () => updateTools(),
    onTransaction: () => updateTools()
});

const commands = [
    ['bold', 'Gras', 'bold', () => editor.chain().focus().toggleBold().run()],
    ['italic', 'Italique', 'italic', () => editor.chain().focus().toggleItalic().run()],
    ['heading-2', 'Titre de niveau 2', 'heading', () => editor.chain().focus().toggleHeading({ level: 2 }).run(), { level: 2 }],
    ['heading-3', 'Titre de niveau 3', 'heading', () => editor.chain().focus().toggleHeading({ level: 3 }).run(), { level: 3 }],
    ['list', 'Liste à puces', 'bulletList', () => editor.chain().focus().toggleBulletList().run()],
    ['list-ordered', 'Liste numérotée', 'orderedList', () => editor.chain().focus().toggleOrderedList().run()],
    ['quote', 'Citation', 'blockquote', () => editor.chain().focus().toggleBlockquote().run()],
    ['link', 'Ajouter un lien', 'link', () => {
        const url = window.prompt('Adresse du lien', editor.getAttributes('link').href || 'https://');
        if (url === null) return;
        if (!url.trim()) { editor.chain().focus().unsetLink().run(); return; }
        if (!/^(https?:\/\/|mailto:)/i.test(url.trim())) { message('Utilisez une adresse http, https ou mailto.', true); return; }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
    }],
    ['unlink', 'Retirer le lien', null, () => editor.chain().focus().unsetLink().run()],
    ['image-plus', 'Insérer une image', null, () => $('bodyUpload').click()],
    ['undo-2', 'Annuler', null, () => editor.chain().focus().undo().run()],
    ['redo-2', 'Rétablir', null, () => editor.chain().focus().redo().run()]
];
for (const [icon, label, , command] of commands) {
    const button = document.createElement('button'); button.type = 'button'; button.title = label; button.setAttribute('aria-label', label); button.dataset.command = icon;
    button.innerHTML = `<i data-lucide="${icon}"></i>`;
    button.addEventListener('click', command); $('editorTools').append(button);
}
createIcons({ icons });
function updateTools() {
    // The editor may emit a transaction before the toolbar has been initialized.
    for (const button of $('editorTools').querySelectorAll('button')) {
        const command = commands.find(c => c[0] === button.dataset.command);
        if (command?.[2]) button.setAttribute('aria-pressed', String(editor.isActive(command[2], command[4])));
    }
}

function values() {
    return { title: $('articleTitle').value, summary: $('articleSummary').value, author: $('articleAuthor').value, cover_url: coverUrl, cover_alt: $('coverAlt').value, body_html: editor.getHTML() };
}
function renderState() {
    const published = article.status === 'published';
    $('editorHeading').textContent = id ? 'Modifier l’article' : 'Nouvel article';
    $('articleState').textContent = published ? 'Publié' : 'Brouillon';
    $('articleState').className = `cms-status${published ? ' cms-status--published' : ''}`;
    $('publicationDate').textContent = article.published_at ? `Publication : ${articleDate(article.published_at)}` : '';
    $('saveLabel').textContent = published ? "Mettre à jour l'article publié" : 'Enregistrer le brouillon';
    $('publishButton').hidden = published;
    $('unpublishButton').hidden = !published;
    $('deleteButton').hidden = !id || published;
    $('publicLink').hidden = !published;
    if (published) $('publicLink').href = `./article.html?slug=${encodeURIComponent(article.slug)}`;
    $('coverPreview').hidden = !coverUrl; $('removeCover').hidden = !coverUrl;
    if (coverUrl) $('coverPreview').src = coverUrl; else $('coverPreview').removeAttribute('src');
    $('coverPreview').alt = $('coverAlt').value;
}
function setBusy(value) {
    busy = value;
    $('editorFields').disabled = value || !ready;
    // Changing the busy state is not a content edit and must preserve feedback.
    editor.setEditable(!value && ready, false);
    for (const name of ['saveButton', 'publishButton', 'previewButton']) $(name).disabled = value || !ready;
}
function report(error) {
    message(error.message || 'Une erreur est survenue. Réessayez.', true);
    $('loginAgain').hidden = ![401, 403].includes(error.status);
}
async function run(task) {
    if (busy || !ready) return;
    setBusy(true); $('loginAgain').hidden = true;
    try { await task(); } catch (error) { report(error); }
    finally { setBusy(false); renderState(); }
}
async function save() {
    const data = await articleApi(id ? `/${id}` : '', { admin: true, method: id ? 'PUT' : 'POST', body: values() });
    article = data.article; id = article.id;
    history.replaceState(null, '', `?id=${id}`);
    editor.commands.setContent(article.body_html, { emitUpdate: false });
    dirty = false;
    message(article.status === 'published' ? 'Article publié mis à jour.' : 'Brouillon enregistré.');
    if (preview) $('articlePreview').innerHTML = articleMarkup({ ...article, ...values() });
}
form.addEventListener('input', markDirty);
function validateForm(forPublication = article.status === 'published') {
    const requirements = [
        ['articleTitle', true, 'Le titre est obligatoire.'],
        ['articleSummary', forPublication, 'Ajoutez un résumé avant de publier.'],
        ['articleAuthor', forPublication, 'Ajoutez un auteur avant de publier.'],
        ['coverAlt', forPublication && Boolean(coverUrl), "Décrivez l'image de couverture avant de publier."]
    ];
    for (const [fieldId, required, error] of requirements) {
        const field = $(fieldId);
        field.setCustomValidity(required && !field.value.trim() ? error : '');
        field.removeAttribute('aria-invalid');
    }
    const invalid = form.querySelector('input:invalid, textarea:invalid, select:invalid');
    const emptyBody = forPublication && !editor.getText().trim();
    editor.view.dom.removeAttribute('aria-invalid');
    if (!invalid && !emptyBody) return true;
    if (preview) $('previewButton').click();
    if (invalid) {
        invalid.setAttribute('aria-invalid', 'true');
        message(invalid.validationMessage, true);
        invalid.focus();
        invalid.reportValidity();
    } else {
        message('Ajoutez du contenu avant de publier.', true);
        editor.view.dom.setAttribute('aria-invalid', 'true');
        editor.commands.focus();
    }
    return false;
}
form.addEventListener('submit', event => { event.preventDefault(); if (validateForm()) run(save); });
$('publishButton').onclick = () => {
    if (!validateForm(true)) return;
    run(async () => {
        await save();
        ({ article } = await articleApi(`/${id}/publish`, { admin: true, method: 'POST' }));
        message('Article publié. Il est maintenant visible dans les actualités.');
    });
};
$('unpublishButton').onclick = () => {
    if (!window.confirm('Retirer cet article des actualités publiques ?')) return;
    run(async () => { ({ article } = await articleApi(`/${id}/unpublish`, { admin: true, method: 'POST' })); message(dirty ? 'Article retiré. Vos modifications restent à enregistrer.' : 'Article retiré de la publication.'); });
};
$('deleteButton').onclick = () => {
    if (!window.confirm('Supprimer définitivement ce brouillon ?')) return;
    run(async () => { await articleApi(`/${id}`, { admin: true, method: 'DELETE' }); dirty = false; location.href = './admin-dashboard.html#articles'; });
};
$('previewButton').onclick = () => {
    preview = !preview; form.hidden = preview; $('articlePreview').hidden = !preview;
    $('previewButton').setAttribute('aria-pressed', String(preview));
    if (preview) $('articlePreview').innerHTML = articleMarkup({ ...article, ...values() });
};
$('removeCover').onclick = () => { coverUrl = ''; $('coverAlt').value = ''; $('coverUpload').value = ''; markDirty(); renderState(); };
for (const inputId of ['coverUpload', 'bodyUpload']) {
    $(inputId).addEventListener('change', () => {
        const file = $(inputId).files[0]; if (!file) return;
        $(inputId).value = '';
        if (file.size > 5 * 1024 * 1024) { message('La taille maximale est de 5 Mo.', true); return; }
        const alt = inputId === 'bodyUpload' ? window.prompt("Description de l'image", '') : null;
        if (inputId === 'bodyUpload' && alt === null) return;
        run(async () => {
            message("Envoi de l'image...");
            const body = new FormData(); body.append('image', file);
            const { url } = await articleApi('/images', { admin: true, method: 'POST', body });
            if (inputId === 'coverUpload') coverUrl = url;
            else editor.chain().focus().setImage({ src: url, alt: alt || '' }).run();
            markDirty();
        });
    });
}
window.addEventListener('beforeunload', event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
$('loginAgain').onclick = () => { $('reauthMessage').textContent = ''; $('reauthDialog').showModal(); };
$('reauthCancel').onclick = () => $('reauthDialog').close();
$('reauthForm').addEventListener('submit', async event => {
    event.preventDefault(); $('reauthSubmit').disabled = true;
    try {
        const response = await fetch(`${window.AANM_API_BASE}/api/admin/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: $('reauthUsername').value, password: $('reauthPassword').value })
        });
        const result = await response.json();
        if (!response.ok || !result.token) throw new Error('Connexion refusée. Vérifiez vos identifiants.');
        sessionStorage.setItem('adminToken', result.token); $('reauthPassword').value = '';
        $('reauthDialog').close(); $('loginAgain').hidden = true;
        message('Session rétablie. Votre contenu a été conservé.');
        if (!ready) await load();
    } catch (error) { $('reauthMessage').textContent = error.message; }
    finally { $('reauthSubmit').disabled = false; }
});
async function load() {
    if (!id) { renderState(); return; }
    ready = false; setBusy(true); $('retryLoad').hidden = true;
    try {
        ({ article } = await articleApi(`/${encodeURIComponent(id)}`, { admin: true }));
        $('articleTitle').value = article.title; $('articleSummary').value = article.summary; $('articleAuthor').value = article.author; $('coverAlt').value = article.cover_alt;
        coverUrl = article.cover_url; editor.commands.setContent(article.body_html, { emitUpdate: false });
        dirty = false; ready = true; message(''); renderState();
    } catch (error) { report(error); $('retryLoad').hidden = false; }
    finally { setBusy(false); }
}
$('retryLoad').onclick = load;
load();
