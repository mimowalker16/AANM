-- ============================================================
-- AANM — Supabase schema + seed
-- Run this once in the Supabase SQL Editor (or via psql).
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- ============================================================

-- ── Tables ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS seminaires (
    id              SERIAL PRIMARY KEY,
    title           TEXT NOT NULL,
    date            TEXT NOT NULL,
    location        TEXT,
    delivery_mode   TEXT DEFAULT 'in_person'
                        CHECK (delivery_mode IN ('in_person', 'virtual')),
    virtual_room_url TEXT,
    description     TEXT,
    capacity        INTEGER,
    is_open         BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registrations (
    id                          SERIAL PRIMARY KEY,
    seminar_id                  INTEGER NOT NULL REFERENCES seminaires(id) ON DELETE CASCADE,
    full_name                   TEXT NOT NULL,
    email                       TEXT NOT NULL,
    phone                       TEXT,
    status                      TEXT NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'approved')),
    approved_at                 TIMESTAMPTZ,
    confirmation_email_sent_at  TIMESTAMPTZ,
    confirmation_email_error    TEXT,
    answers_json                JSONB DEFAULT '[]'::jsonb,
    files_json                  JSONB DEFAULT '[]'::jsonb,
    registered_at               TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (seminar_id, email)
);

CREATE TABLE IF NOT EXISTS seminar_questions (
    id                      SERIAL PRIMARY KEY,
    seminar_id              INTEGER NOT NULL REFERENCES seminaires(id) ON DELETE CASCADE,
    question_key            TEXT NOT NULL,
    label                   TEXT NOT NULL,
    description             TEXT,
    field_type              TEXT NOT NULL CHECK (field_type IN ('text','email','phone','textarea','single_choice','multiple_choice','file','info_block')),
    is_required             BOOLEAN DEFAULT false,
    sort_order              INTEGER DEFAULT 0,
    is_active               BOOLEAN DEFAULT true,
    placeholder             TEXT,
    help_text               TEXT,
    options_json            JSONB,
    validation_json         JSONB,
    allow_multiple_files    BOOLEAN DEFAULT false,
    max_files               INTEGER DEFAULT 1,
    max_file_size_mb        INTEGER DEFAULT 100,
    allowed_mime_types_json JSONB,
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (seminar_id, question_key)
);

CREATE TABLE IF NOT EXISTS labs (
    id               SERIAL PRIMARY KEY,
    lab_name         TEXT NOT NULL,
    institution_name TEXT,
    contact_person   TEXT NOT NULL,
    contact_email    TEXT NOT NULL,
    phone            TEXT,
    website          TEXT,
    address          TEXT NOT NULL,
    city             TEXT NOT NULL,
    country          TEXT NOT NULL,
    coordinates_lat  DOUBLE PRECISION NOT NULL,
    coordinates_lng  DOUBLE PRECISION NOT NULL,
    research_areas   TEXT NOT NULL,
    description      TEXT,
    established_year INTEGER,
    submitted_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    approved         BOOLEAN DEFAULT false,
    admin_notes      TEXT
);

-- ── Seed data ─────────────────────────────────────────────────

INSERT INTO labs (id, lab_name, institution_name, contact_person, contact_email, phone, website, address, city, country, coordinates_lat, coordinates_lng, research_areas, description, established_year, submitted_at, approved, admin_notes) VALUES
(1,  'Institute of Natural Medicine Research',    'University of Algiers',         'Dr. Amina Benali',          'research@univ-alger.dz',           '+213 21 123 456',    'https://www.univ-alger.dz',         '2 Rue Didouche Mourad, Algiers',                              'Algiers',    'Algeria',    36.7538,            3.0588,            '["medicinal-plants", "pharmacology", "toxicology"]',          'Leading research center focusing on traditional North African medicinal plants and their therapeutic applications.',                                   1985, '2026-02-23 09:45:50+01', true,  NULL),
(2,  'Moroccan Center for Phytotherapy',          'Mohammed V University',          'Prof. Hassan El Rhazi',     'phyto@um5.ac.ma',                  '+212 5 37 123 456',  'https://www.um5.ac.ma',             'Avenue Ibn Battouta, Rabat',                                  'Rabat',      'Morocco',    34.0209,           -6.8416,            '["phytotherapy", "essential-oils", "clinical-trials"]',       'Specialized laboratory for phytotherapy research and clinical validation of traditional Moroccan remedies.',                                           1992, '2026-02-23 09:45:50+01', true,  NULL),
(3,  'Tunis Institute of Pharmacognosy',          'University of Tunis El Manar',   'Dr. Leila Chekir-Ghedira', 'pharmacog@utm.tn',                  '+216 71 123 456',    'https://www.utm.tn',                'Campus Universitaire, Tunis',                                 'Tunis',      'Tunisia',    36.8065,           10.1815,            '["pharmacognosy", "natural-products", "drug-discovery"]',     'Research facility dedicated to the study of natural products and drug discovery from Mediterranean flora.',                                            1978, '2026-02-23 09:45:50+01', true,  NULL),
(4,  'Libya Natural Medicine Laboratory',         'University of Tripoli',          'Dr. Omar Al-Magrabi',       'natmed@uot.edu.ly',                 '+218 21 123 456',    'https://www.uot.edu.ly',            'University Campus, Tripoli',                                  'Tripoli',    'Libya',      32.8872,           13.1913,            '["traditional-medicine", "antimicrobial", "wound-healing"]',  'Laboratory focusing on traditional Libyan medicinal practices and antimicrobial natural compounds.',                                                   1995, '2026-02-23 09:45:50+01', true,  NULL),
(5,  'Cairo Herbal Research Center',             'Cairo University',               'Prof. Mahmoud El-Sissi',    'herbs@cu.edu.eg',                   '+20 2 123 456 789',  'https://www.cu.edu.eg',             'Faculty of Pharmacy, Kasr El Aini Street',                    'Cairo',      'Egypt',      30.0444,           31.2357,            '["herbal-medicine", "quality-control", "standardization"]',   'Premier Egyptian facility for herbal medicine research and standardization of medicinal plant preparations.',                                          1965, '2026-02-23 09:45:50+01', true,  NULL),
(6,  'Casablanca Bioactive Compounds Lab',        'Hassan II University',           'Dr. Fatima Zahra Kabbaj',   'bioactive@univh2c.ma',              '+212 5 22 123 456',  'https://www.univh2c.ma',            'Faculty of Sciences, Casablanca',                             'Casablanca', 'Morocco',    33.5731,           -7.5898,            '["bioactive-compounds", "antioxidants", "nutraceuticals"]',   'Research laboratory specializing in isolation and characterization of bioactive compounds from North African plants.',                                 2001, '2026-02-23 09:45:50+01', true,  NULL),
(7,  'Mauritanian Traditional Medicine Center',   'University of Nouakchott',       'Dr. Ahmed Ould Mohamed',    'ahmed.mohamed@univ-nkc.mr',          '+222 45 123 456',    'https://www.univ-nkc.mr',           'University Campus, Nouakchott',                               'Nouakchott', 'Mauritania', 18.0735,          -15.9582,            '["traditional-medicine", "desert-plants", "ethnobotany"]',    'Research center dedicated to studying traditional Mauritanian medicinal practices and desert flora with therapeutic properties.',                       2010, '2026-02-23 09:50:19+01', true,  'Approved via admin dashboard'),
(8,  'Sudanese Natural Products Laboratory',      'University of Khartoum',         'Prof. Fatima Al-Bashir',    'f.albashir@uofk.edu',               '+249 11 123 456',    'https://www.uofk.edu',              'Faculty of Pharmacy, University of Khartoum',                 'Khartoum',   'Sudan',      15.5007,           32.5599,            '["natural-products", "antimalarial", "pharmacokinetics"]',    'Advanced laboratory focusing on isolation and development of antimalarial compounds from Sudanese medicinal plants.',                                  1998, '2026-02-23 09:50:19+01', true,  'Approved via admin dashboard'),
(9,  'Algerian Aromatherapy Research Lab',        'University of Constantine',      'Dr. Nadia Benhadj',         'nadia.benhadj@univ-constantine2.dz', '+213 31 123 456',   'https://www.univ-constantine2.dz',  'Department of Chemistry, Constantine',                        'Constantine','Algeria',    36.365,             6.6147,            '["aromatherapy", "essential-oils", "volatile-compounds"]',    'Specialized research facility for essential oil extraction, analysis, and therapeutic application studies from Algerian aromatic plants.',             2005, '2026-02-23 09:50:19+01', true,  'Approved via admin dashboard'),
(10, 'tur,ceye',                                  ':;iu,ynbtgr',                    'mimo ghcky',                'mouayadmerrakchi@gmail.com',         '0558550594',         'https://www.openstreetmap.org/#map=19/36.757827/3.228040', 'Tamentfoust, El Marsa, Dar el-Beida District, Algiers, 16115, Algeria', 'Tamentfoust','Algeria',  36.80723686930441,  3.229513921725627,  '["ecology","medical-research","environmental-science"]',      'exrcgthyvjbu,;',                                                                                                                                      2013, '2026-02-23 10:09:43+01', true,  'Approved via admin dashboard')
ON CONFLICT (id) DO NOTHING;

INSERT INTO seminaires (id, title, date, location, description, capacity, is_open, created_at) VALUES
(6, 'Les lipides',   '2026-03-29T02:03', NULL,          NULL, NULL, false, '2026-03-15 01:04:00+01'),
(7, 'Les vitamines', '2026-03-15T02:06', NULL,          NULL, NULL, false, '2026-03-15 01:04:56+01'),
(8, 'Les vitamines', '2026-05-27T20:36', 'wdfbsdfbcbs', 'zaegxag', 124, true, '2026-05-27 20:26:26.613916+01')
ON CONFLICT (id) DO NOTHING;

INSERT INTO registrations (id, seminar_id, full_name, email, phone, status, registered_at) VALUES
(1, 8, 'mimo ghcky', 'mouayadmerrakchi@gmail.com', '+213558550594', 'approved', '2026-05-27 20:27:27.338192+01')
ON CONFLICT (id) DO NOTHING;

-- ── Reset sequences to max(id) so next INSERT gets the right id ──

SELECT setval('labs_id_seq',          (SELECT MAX(id) FROM labs));
SELECT setval('seminaires_id_seq',    (SELECT MAX(id) FROM seminaires));
SELECT setval('registrations_id_seq', (SELECT MAX(id) FROM registrations));
