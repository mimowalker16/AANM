# Seminar Registration System — Implementation Plan

## User Decisions

| Question | Answer |
|---|---|
| DB structure | Single DB with two new tables |
| Form fields | Full name, email, phone only |
| Admin management | Full: create, edit, open/close seminars |
| Duplicate email | Block duplicates (409 response) |

## Open Question

Should the activities page CTA dynamically fetch the latest open seminar ID, or be hardcoded to `?id=1`?

---

## Phase 1 — Backend

### Step 1 — `server/database/index.js`

Add to `initializeTables()`:

**`seminaires` table:**
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `title` TEXT NOT NULL
- `date` TEXT NOT NULL
- `location` TEXT
- `description` TEXT
- `capacity` INTEGER
- `is_open` INTEGER DEFAULT 1
- `created_at` TEXT DEFAULT CURRENT_TIMESTAMP

**`registrations` table:**
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `seminar_id` INTEGER NOT NULL REFERENCES seminaires(id) ON DELETE CASCADE
- `full_name` TEXT NOT NULL
- `email` TEXT NOT NULL
- `phone` TEXT
- `registered_at` TEXT DEFAULT CURRENT_TIMESTAMP
- UNIQUE constraint on `(seminar_id, email)`

**DB methods to add:**
- `createSeminaire(data)`
- `getSeminaires()`
- `getSeminaireById(id)`
- `updateSeminaire(id, data)`
- `toggleSeminaireOpen(id)`
- `createRegistration(seminarId, data)` — enforce UNIQUE, return 409 on duplicate
- `getRegistrationsBySeminar(seminarId)`
- `deleteRegistration(id)`
- `getRegistrationCount(seminarId)`

### Step 2 — `server/controllers/seminaireController.js` *(new)*

Public endpoints:
- `getSeminaires` — list all (optionally only open ones)
- `getSeminaireById` — fetch single seminar with registration count
- `registerForSeminaire` — check `is_open`, check capacity, check duplicate email → 409, then insert

### Step 3 — `server/controllers/adminSeminaireController.js` *(new)*

Protected endpoints:
- `createSeminaire`
- `updateSeminaire`
- `toggleOpen`
- `getRegistrations`
- `deleteRegistration`

### Step 4 — `server/routes/seminaires.js` *(new)*

```
GET  /api/seminaires
GET  /api/seminaires/:id
POST /api/seminaires/:id/register   (rate limited)
```

### Step 5 — `server/routes/admin.js`

Add protected seminar routes:
```
GET    /api/admin/seminaires
POST   /api/admin/seminaires
PUT    /api/admin/seminaires/:id
PUT    /api/admin/seminaires/:id/toggle
GET    /api/admin/seminaires/:id/registrations
DELETE /api/admin/registrations/:id
```

### Step 6 — `server/index.js`

Mount the new router:
```js
app.use('/api/seminaires', seminaireRoutes)
```

---

## Phase 2 — `seminar-register.html` *(new page)*

- Reads `?id=X` from URL query string
- Fetches seminar detail from `GET /api/seminaires/:id`
- Displays: title, date, location, description, capacity remaining, countdown timer
- Form fields: Full Name, Email, Phone
- States to handle:
  - Registration open → show form
  - `is_open = 0` → "Inscriptions fermées" message
  - Capacity reached → "Complet" message
  - Duplicate email (409) → "Vous êtes déjà inscrit(e)" message
  - Success → confirmation card with seminar details
- Add to `vite.config.js` rollupOptions.input

---

## Phase 3 — `activities.html` CTA Update

**Current button (line ~538):**
```html
<div class="countdown-card__actions">
    <a href="./contact.html" class="btn btn--primary">
        S'inscrire Maintenant
        <svg>...arrow icon...</svg>
    </a>
    <a href="#" class="btn btn--outline-dark">En savoir plus</a>
</div>
```

**Target:** Change href to `./seminar-register.html?id=X`

**Options:**
- Static: hardcode `?id=1`
- Dynamic: fetch `GET /api/seminaires` on page load, find first open seminar, set href + update button state to "Complet" or "Fermé" if applicable

---

## Phase 4 — Admin Dashboard Séminaires Tab

Add new tab in `admin-dashboard.html` alongside existing Pending / Approved tabs.

**Tab contents:**

### Create Seminar Form
- Fields: title, date (datetime-local), location, description, capacity
- Submit → `POST /api/admin/seminaires`

### Seminar List
- Cards or table rows per seminar
- Shows: title, date, registration count / capacity, open/closed badge
- Actions: Edit (inline or modal), Open/Close toggle, Delete

### Registrations View
- Expandable section or modal per seminar
- Table: full_name, email, phone, registered_at
- Delete individual registration button

---

## Key File Paths

- `c:\Users\mouay\Projects\AANM\server\database\index.js`
- `c:\Users\mouay\Projects\AANM\server\index.js`
- `c:\Users\mouay\Projects\AANM\server\routes\admin.js`
- `c:\Users\mouay\Projects\AANM\server\routes\seminaires.js` *(to create)*
- `c:\Users\mouay\Projects\AANM\server\controllers\seminaireController.js` *(to create)*
- `c:\Users\mouay\Projects\AANM\server\controllers\adminSeminaireController.js` *(to create)*
- `c:\Users\mouay\Projects\AANM\seminar-register.html` *(to create)*
- `c:\Users\mouay\Projects\AANM\activities.html` (line ~538 for CTA)
- `c:\Users\mouay\Projects\AANM\admin-dashboard.html`
- `c:\Users\mouay\Projects\AANM\vite.config.js`
