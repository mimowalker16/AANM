import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

class Database {
    constructor() {
        this.pool = null;
        this.isConnected = false;
    }

    async connect() {
        if (!config.database.url) {
            throw new Error('DATABASE_URL is required. Example: postgres://user:password@host:5432/aanm');
        }

        this.logConnectionTarget(config.database.url, config.database.ssl);
        const sslCandidates = this.getSslCandidates(config.database.url, config.database.ssl);
        let lastError = null;

        for (const ssl of sslCandidates) {
            try {
                console.log(`🔌 Trying PostgreSQL connection with ${ssl ? 'SSL' : 'plain TCP'}...`);
                this.pool = new Pool({
                    connectionString: config.database.url,
                    ssl,
                    // Keep the pool small for managed DBs (Supabase free tier caps
                    // real connections at 15; the transaction pooler is generous but
                    // the underlying limit still applies).
                    max: parseInt(process.env.DB_POOL_MAX, 10) || 5,
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 10000
                });

                await this.pool.query('SELECT 1');
                console.log(`✅ PostgreSQL connection mode: ${ssl ? 'ssl' : 'plain'}`);
                lastError = null;
                break;
            } catch (error) {
                lastError = error;
                console.error(`⚠️ PostgreSQL ${ssl ? 'SSL' : 'plain TCP'} connection failed: ${error.code || error.name} ${error.message}`);
                if (this.pool) {
                    await this.pool.end().catch(() => {});
                    this.pool = null;
                }
            }
        }

        if (lastError) {
            throw lastError;
        }

        this.isConnected = true;
        console.log('✅ Connected to PostgreSQL database');

        // Skip DDL migrations when the schema is managed externally (e.g. Supabase).
        // Set SKIP_TABLE_INIT=true in production to avoid unnecessary round-trips.
        if (process.env.SKIP_TABLE_INIT === 'true') {
            console.log('⏭️  SKIP_TABLE_INIT=true — skipping table migration (schema managed externally)');
        } else {
            await this.initializeTables();
        }
    }

    logConnectionTarget(databaseUrl, sslMode) {
        try {
            const url = new URL(databaseUrl);
            console.log(`🗄️ PostgreSQL target: host=${url.hostname} port=${url.port || '5432'} database=${url.pathname.replace(/^\//, '') || '(none)'} ssl=${sslMode || 'auto'}`);
        } catch {
            console.log('🗄️ PostgreSQL target: unable to parse DATABASE_URL');
        }
    }

    getSslCandidates(databaseUrl, sslMode) {
        if (sslMode === 'true') {
            return [{ rejectUnauthorized: false }];
        }

        if (sslMode === 'false') {
            return [false];
        }

        const url = new URL(databaseUrl);
        const explicitSslMode = url.searchParams.get('sslmode');

        if (explicitSslMode === 'disable') {
            return [false];
        }

        if (explicitSslMode) {
            return [{ rejectUnauthorized: false }];
        }

        const host = url.hostname;
        const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
        return isLocalHost ? [false] : [{ rejectUnauthorized: false }, false];
    }

    async initializeTables() {
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS seminaires (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                date TEXT NOT NULL,
                location TEXT,
                delivery_mode TEXT DEFAULT 'in_person',
                virtual_room_url TEXT,
                description TEXT,
                capacity INTEGER,
                is_open BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await this.ensureIdSequence('seminaires');

        await this.pool.query('ALTER TABLE seminaires ADD COLUMN IF NOT EXISTS location TEXT');
        await this.pool.query('ALTER TABLE seminaires ADD COLUMN IF NOT EXISTS description TEXT');
        await this.pool.query('ALTER TABLE seminaires ADD COLUMN IF NOT EXISTS capacity INTEGER');
        await this.pool.query('ALTER TABLE seminaires ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true');
        await this.pool.query('ALTER TABLE seminaires ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP');
        await this.pool.query("ALTER TABLE seminaires ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT 'in_person'");
        await this.pool.query('ALTER TABLE seminaires ADD COLUMN IF NOT EXISTS virtual_room_url TEXT');
        await this.pool.query("UPDATE seminaires SET is_open = true WHERE is_open IS NULL");
        await this.pool.query("UPDATE seminaires SET delivery_mode = 'in_person' WHERE delivery_mode IS NULL");
        await this.pool.query("ALTER TABLE seminaires ALTER COLUMN is_open SET DEFAULT true");
        await this.pool.query("ALTER TABLE seminaires ALTER COLUMN delivery_mode SET DEFAULT 'in_person'");
        await this.pool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'seminaires_delivery_mode_check'
                ) THEN
                    ALTER TABLE seminaires
                    ADD CONSTRAINT seminaires_delivery_mode_check
                    CHECK (delivery_mode IN ('in_person', 'virtual'));
                END IF;
            END
            $$;
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS registrations (
                id SERIAL PRIMARY KEY,
                seminar_id INTEGER NOT NULL REFERENCES seminaires(id) ON DELETE CASCADE,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                status TEXT DEFAULT 'pending',
                approved_at TIMESTAMPTZ,
                confirmation_email_sent_at TIMESTAMPTZ,
                confirmation_email_error TEXT,
                registered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(seminar_id, email)
            )
        `);
        await this.ensureIdSequence('registrations');

        await this.pool.query('ALTER TABLE registrations ADD COLUMN IF NOT EXISTS status TEXT');
        await this.pool.query('ALTER TABLE registrations ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ');
        await this.pool.query('ALTER TABLE registrations ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ');
        await this.pool.query('ALTER TABLE registrations ADD COLUMN IF NOT EXISTS confirmation_email_error TEXT');
        await this.pool.query("ALTER TABLE registrations ADD COLUMN IF NOT EXISTS answers_json JSONB DEFAULT '[]'::jsonb");
        await this.pool.query("ALTER TABLE registrations ADD COLUMN IF NOT EXISTS files_json JSONB DEFAULT '[]'::jsonb");
        await this.pool.query("UPDATE registrations SET status = 'approved' WHERE status IS NULL");
        await this.pool.query("UPDATE registrations SET approved_at = registered_at WHERE status = 'approved' AND approved_at IS NULL");
        await this.pool.query("UPDATE registrations SET answers_json = '[]'::jsonb WHERE answers_json IS NULL");
        await this.pool.query("UPDATE registrations SET files_json = '[]'::jsonb WHERE files_json IS NULL");
        await this.pool.query("ALTER TABLE registrations ALTER COLUMN status SET DEFAULT 'pending'");
        await this.pool.query("ALTER TABLE registrations ALTER COLUMN status SET NOT NULL");
        await this.pool.query('ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_seminar_id_key');
        await this.pool.query('ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_email_key');
        await this.pool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'registrations_status_check'
                ) THEN
                    ALTER TABLE registrations
                    ADD CONSTRAINT registrations_status_check
                    CHECK (status IN ('pending', 'approved'));
                END IF;
            END
            $$;
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS seminar_questions (
                id SERIAL PRIMARY KEY,
                seminar_id INTEGER NOT NULL REFERENCES seminaires(id) ON DELETE CASCADE,
                question_key TEXT NOT NULL,
                label TEXT NOT NULL,
                description TEXT,
                field_type TEXT NOT NULL,
                is_required BOOLEAN DEFAULT false,
                sort_order INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT true,
                placeholder TEXT,
                help_text TEXT,
                options_json JSONB,
                validation_json JSONB,
                allow_multiple_files BOOLEAN DEFAULT false,
                max_files INTEGER DEFAULT 1,
                max_file_size_mb INTEGER DEFAULT 100,
                allowed_mime_types_json JSONB,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(seminar_id, question_key)
            )
        `);
        await this.ensureIdSequence('seminar_questions');

        await this.pool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'seminar_questions_field_type_check'
                ) THEN
                    ALTER TABLE seminar_questions
                    ADD CONSTRAINT seminar_questions_field_type_check
                    CHECK (field_type IN ('text','email','phone','textarea','single_choice','multiple_choice','file','info_block'));
                END IF;
            END
            $$;
        `);

        const missingQuestions = await this.pool.query(`
            SELECT s.id
            FROM seminaires s
            WHERE NOT EXISTS (
                SELECT 1
                FROM seminar_questions q
                WHERE q.seminar_id = s.id
            )
        `);
        for (const row of missingQuestions.rows) {
            await this.seedDefaultSeminaireQuestions(row.id);
        }

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS labs (
                id SERIAL PRIMARY KEY,
                lab_name TEXT NOT NULL,
                institution_name TEXT,
                contact_person TEXT NOT NULL,
                contact_email TEXT NOT NULL,
                phone TEXT,
                website TEXT,
                address TEXT NOT NULL,
                city TEXT NOT NULL,
                country TEXT NOT NULL,
                coordinates_lat DOUBLE PRECISION NOT NULL,
                coordinates_lng DOUBLE PRECISION NOT NULL,
                research_areas TEXT NOT NULL,
                description TEXT,
                established_year INTEGER,
                submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                approved BOOLEAN DEFAULT false,
                admin_notes TEXT,
                record_type TEXT DEFAULT 'lab',
                full_name TEXT,
                wilaya TEXT,
                qualifications_json JSONB DEFAULT '[]'::jsonb,
                specialist_specialty TEXT,
                qualification_other TEXT,
                practices_json JSONB DEFAULT '[]'::jsonb,
                practice_other TEXT
            )
        `);
        await this.ensureIdSequence('labs');
        await this.pool.query("ALTER TABLE labs ADD COLUMN IF NOT EXISTS record_type TEXT DEFAULT 'lab'");
        await this.pool.query('ALTER TABLE labs ADD COLUMN IF NOT EXISTS full_name TEXT');
        await this.pool.query('ALTER TABLE labs ADD COLUMN IF NOT EXISTS wilaya TEXT');
        await this.pool.query("ALTER TABLE labs ADD COLUMN IF NOT EXISTS qualifications_json JSONB DEFAULT '[]'::jsonb");
        await this.pool.query('ALTER TABLE labs ADD COLUMN IF NOT EXISTS specialist_specialty TEXT');
        await this.pool.query('ALTER TABLE labs ADD COLUMN IF NOT EXISTS qualification_other TEXT');
        await this.pool.query("ALTER TABLE labs ADD COLUMN IF NOT EXISTS practices_json JSONB DEFAULT '[]'::jsonb");
        await this.pool.query('ALTER TABLE labs ADD COLUMN IF NOT EXISTS practice_other TEXT');
        await this.pool.query("UPDATE labs SET record_type = 'lab' WHERE record_type IS NULL");
        await this.pool.query("UPDATE labs SET qualifications_json = '[]'::jsonb WHERE qualifications_json IS NULL");
        await this.pool.query("UPDATE labs SET practices_json = '[]'::jsonb WHERE practices_json IS NULL");

        console.log('📊 PostgreSQL tables ready');
    }

    async ensureIdSequence(tableName) {
        if (!/^[a-z_]+$/.test(tableName)) {
            throw new Error(`Invalid table name: ${tableName}`);
        }

        const sequenceName = `${tableName}_id_seq`;
        await this.pool.query(`CREATE SEQUENCE IF NOT EXISTS ${sequenceName}`);
        await this.pool.query(`ALTER SEQUENCE ${sequenceName} OWNED BY ${tableName}.id`);
        await this.pool.query(`ALTER TABLE ${tableName} ALTER COLUMN id SET DEFAULT nextval('${sequenceName}')`);
        await this.pool.query(`
            SELECT setval(
                '${sequenceName}',
                COALESCE((SELECT MAX(id) FROM ${tableName}), 0) + 1,
                false
            )
        `);
    }

    parseJsonField(value, fallback = []) {
        if (Array.isArray(value)) return value;
        if (value && typeof value === 'object') return value;
        try {
            return JSON.parse(value || JSON.stringify(fallback));
        } catch {
            return fallback;
        }
    }

    parseLab(row) {
        const practices = this.parseJsonField(row.practices_json, this.parseJsonField(row.research_areas, []));
        const qualifications = this.parseJsonField(row.qualifications_json, []);
        return {
            ...row,
            full_name: row.full_name || row.lab_name,
            wilaya: row.wilaya || row.city,
            qualifications,
            practices,
            researchAreas: practices
        };
    }

    nextParam(params, value) {
        params.push(value);
        return `$${params.length}`;
    }

    async createLab(labData) {
        const sql = `
            INSERT INTO labs (
                lab_name, institution_name, contact_person, contact_email,
                phone, website, address, city, country, coordinates_lat,
                coordinates_lng, research_areas, description, established_year,
                record_type, full_name, wilaya, qualifications_json,
                specialist_specialty, qualification_other, practices_json,
                practice_other
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                $15, $16, $17, $18::jsonb, $19, $20, $21::jsonb, $22
            )
            RETURNING id
        `;

        const values = [
            labData.lab_name,
            labData.institution_name,
            labData.contact_person,
            labData.contact_email,
            labData.phone,
            labData.website,
            labData.address,
            labData.city,
            labData.country,
            labData.coordinates_lat,
            labData.coordinates_lng,
            labData.research_areas,
            labData.description,
            labData.established_year,
            labData.record_type || 'cabinet',
            labData.full_name,
            labData.wilaya,
            labData.qualifications_json || '[]',
            labData.specialist_specialty,
            labData.qualification_other,
            labData.practices_json || '[]',
            labData.practice_other
        ];

        const result = await this.pool.query(sql, values);
        return { id: result.rows[0].id, changes: 1 };
    }

    async getApprovedLabs(searchParams = {}) {
        let sql = `
            SELECT
                id, lab_name, institution_name, contact_email, phone, website,
                address, city, country, coordinates_lat, coordinates_lng,
                research_areas, description, established_year, submitted_at,
                record_type, full_name, wilaya, qualifications_json,
                specialist_specialty, qualification_other, practices_json,
                practice_other
            FROM labs
            WHERE approved = true AND record_type = 'cabinet'
        `;
        const params = [];

        if (searchParams.search) {
            const term = `%${searchParams.search}%`;
            const placeholders = Array.from({ length: 10 }, () => this.nextParam(params, term));
            sql += ` AND (
                full_name ILIKE ${placeholders[0]} OR
                lab_name ILIKE ${placeholders[1]} OR
                wilaya ILIKE ${placeholders[2]} OR
                contact_person ILIKE ${placeholders[3]} OR
                city ILIKE ${placeholders[4]} OR
                country ILIKE ${placeholders[5]} OR
                address ILIKE ${placeholders[6]} OR
                description ILIKE ${placeholders[7]} OR
                qualifications_json::text ILIKE ${placeholders[8]} OR
                practices_json::text ILIKE ${placeholders[9]}
            )`;
        }

        if (searchParams.wilaya) {
            sql += ` AND wilaya ILIKE ${this.nextParam(params, `%${searchParams.wilaya}%`)}`;
        }

        if (searchParams.country) {
            sql += ` AND country = ${this.nextParam(params, searchParams.country)}`;
        }

        if (searchParams.city) {
            sql += ` AND city ILIKE ${this.nextParam(params, `%${searchParams.city}%`)}`;
        }

        if (searchParams.institution) {
            sql += ` AND institution_name ILIKE ${this.nextParam(params, `%${searchParams.institution}%`)}`;
        }

        if (searchParams.researchArea) {
            sql += ` AND research_areas ILIKE ${this.nextParam(params, `%${searchParams.researchArea}%`)}`;
        }

        if (searchParams.qualification) {
            const qualifications = String(searchParams.qualification)
                .split(',')
                .map(item => item.trim())
                .filter(Boolean);
            qualifications.forEach(qualification => {
                sql += ` AND qualifications_json::text ILIKE ${this.nextParam(params, `%${qualification}%`)}`;
            });
        }

        if (searchParams.practice) {
            const practices = String(searchParams.practice)
                .split(',')
                .map(item => item.trim())
                .filter(Boolean);
            practices.forEach(practice => {
                sql += ` AND practices_json::text ILIKE ${this.nextParam(params, `%${practice}%`)}`;
            });
        }

        if (searchParams.yearFrom) {
            sql += ` AND established_year >= ${this.nextParam(params, parseInt(searchParams.yearFrom, 10))}`;
        }

        if (searchParams.yearTo) {
            sql += ` AND established_year <= ${this.nextParam(params, parseInt(searchParams.yearTo, 10))}`;
        }

        const validSortColumns = ['full_name', 'lab_name', 'wilaya', 'city', 'country', 'submitted_at'];
        const sortBy = validSortColumns.includes(searchParams.sortBy) ? searchParams.sortBy : 'submitted_at';
        const sortOrder = searchParams.sortOrder === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ${sortBy} ${sortOrder}`;

        if (searchParams.limit) {
            sql += ` LIMIT ${this.nextParam(params, parseInt(searchParams.limit, 10))}`;
            if (searchParams.offset) {
                sql += ` OFFSET ${this.nextParam(params, parseInt(searchParams.offset, 10))}`;
            }
        }

        const result = await this.pool.query(sql, params);
        return result.rows.map((lab) => this.parseLab(lab));
    }

    async getPendingLabs() {
        const result = await this.pool.query(`
            SELECT *
            FROM labs
            WHERE approved = false AND record_type = 'cabinet'
            ORDER BY submitted_at DESC
        `);
        return result.rows.map((lab) => this.parseLab(lab));
    }

    async getLabById(labId, includeUnapproved = false) {
        const sql = `
            SELECT
                id, lab_name, institution_name, contact_person, contact_email,
                phone, website, address, city, country, coordinates_lat,
                coordinates_lng, research_areas, description, established_year,
                submitted_at, approved, admin_notes, record_type, full_name,
                wilaya, qualifications_json, specialist_specialty,
                qualification_other, practices_json, practice_other
            FROM labs
            WHERE id = $1 AND record_type = 'cabinet' ${includeUnapproved ? '' : 'AND approved = true'}
        `;
        const result = await this.pool.query(sql, [labId]);
        return result.rows[0] ? this.parseLab(result.rows[0]) : null;
    }

    async approveLab(labId, adminNotes = null) {
        const result = await this.pool.query(
            'UPDATE labs SET approved = true, admin_notes = $1 WHERE id = $2',
            [adminNotes, labId]
        );
        return { changes: result.rowCount };
    }

    async getSearchSuggestions(field, query = '', limit = 10) {
        const validFields = ['lab_name', 'full_name', 'wilaya', 'city', 'country', 'research_areas', 'qualifications_json', 'practices_json'];

        if (!validFields.includes(field)) {
            throw new Error('Invalid search field');
        }

        const result = await this.pool.query(
            `
                SELECT DISTINCT ${field} AS suggestion
                FROM labs
                WHERE approved = true AND record_type = 'cabinet' AND ${field}::text ILIKE $1
                ORDER BY ${field}
                LIMIT $2
            `,
            [`%${query}%`, parseInt(limit, 10)]
        );

        return result.rows.map((row) => row.suggestion);
    }

    async getSearchStats() {
        const result = await this.pool.query(`
            SELECT
                COUNT(*)::int AS total,
                COUNT(DISTINCT country)::int AS countries,
                COUNT(DISTINCT wilaya)::int AS cities,
                COUNT(DISTINCT wilaya)::int AS institutions,
                NULL AS "oldestYear",
                NULL AS "newestYear"
            FROM labs
            WHERE approved = true AND record_type = 'cabinet'
        `);
        return result.rows[0];
    }

    async deleteLab(labId) {
        const result = await this.pool.query('DELETE FROM labs WHERE id = $1', [labId]);
        return { changes: result.rowCount };
    }

    async createSeminaire(data) {
        const result = await this.pool.query(
            `
                INSERT INTO seminaires (
                    title, date, location, delivery_mode, virtual_room_url,
                    description, capacity, is_open
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            `,
            [
                data.title,
                data.date,
                data.location,
                data.delivery_mode || 'in_person',
                data.virtual_room_url || null,
                data.description,
                data.capacity ?? null,
                data.is_open ?? true
            ]
        );
        return { id: result.rows[0].id };
    }

    async seedDefaultSeminaireQuestions(seminarId) {
        const defaults = [
            {
                question_key: 'email',
                label: 'Adresse e-mail',
                field_type: 'email',
                is_required: true,
                sort_order: 0
            },
            {
                question_key: 'full_name',
                label: 'NOM PRENOM',
                field_type: 'text',
                is_required: true,
                sort_order: 1
            },
            {
                question_key: 'spouse_name',
                label: "NOM DE L'EPOUX (pour les mariées)",
                field_type: 'text',
                is_required: false,
                sort_order: 2
            },
            {
                question_key: 'phone',
                label: 'N° de Téléphone valide pour vous contacter ?',
                field_type: 'phone',
                is_required: true,
                sort_order: 3
            },
            {
                question_key: 'profession',
                label: 'PROFESSION / FONCTION',
                field_type: 'text',
                is_required: true,
                sort_order: 4
            },
            {
                question_key: 'fees_info',
                label: "FRAIS D'INSCRIPTION",
                field_type: 'single_choice',
                is_required: true,
                sort_order: 5,
                description: "REGLEZ via guichets -Algérie poste- CCP : 433997/08 compte: Mr MERRAKCHI Nour Bachir (Alger) ou via BARIDIMOB RIP: 00799999000043399752.",
                options_json: [
                    '15.000 DA - Professionnel de Santé',
                    "10.000 DA - Ancien Nutrithérapeute 2022 de l'AANM",
                    '10.000 DA - Etudiant + certificat de scolarité valide'
                ]
            },
            {
                question_key: 'delivery_office',
                label: 'LIVRAISON des polycopiés: précisez le bureau YALIDINE préféré (wilaya + commune + nom du bureau)',
                field_type: 'textarea',
                is_required: true,
                sort_order: 6
            },
            {
                question_key: 'payment_receipt',
                label: 'RECU DE PAIEMENT',
                field_type: 'file',
                is_required: true,
                sort_order: 7,
                help_text: "Importez jusqu'à 5 fichiers compatibles : PDF, document, image ou spreadsheet. 100 MB max par fichier.",
                allow_multiple_files: true,
                max_files: 5,
                max_file_size_mb: 100,
                allowed_mime_types_json: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
            }
        ];

        for (const item of defaults) {
            await this.pool.query(
                `
                    INSERT INTO seminar_questions (
                        seminar_id, question_key, label, description, field_type, is_required,
                        sort_order, is_active, help_text, options_json,
                        allow_multiple_files, max_files,
                        max_file_size_mb, allowed_mime_types_json
                    )
                    VALUES (
                        $1, $2, $3, $4, $5, $6,
                        $7, true, $8, $9::jsonb,
                        $10, $11, $12, $13::jsonb
                    )
                    ON CONFLICT (seminar_id, question_key) DO NOTHING
                `,
                [
                    seminarId,
                    item.question_key,
                    item.label,
                    item.description || null,
                    item.field_type,
                    item.is_required,
                    item.sort_order,
                    item.help_text || null,
                    item.options_json ? JSON.stringify(item.options_json) : null,
                    Boolean(item.allow_multiple_files),
                    item.max_files || 1,
                    item.max_file_size_mb || 100,
                    item.allowed_mime_types_json ? JSON.stringify(item.allowed_mime_types_json) : null
                ]
            );
        }
    }

    async getSeminaires() {
        const result = await this.pool.query(`
            SELECT s.*,
            (
                SELECT COUNT(*)::int
                FROM registrations r
                WHERE r.seminar_id = s.id AND r.status = 'approved'
            ) AS registration_count,
            (
                SELECT COUNT(*)::int
                FROM registrations r
                WHERE r.seminar_id = s.id AND r.status = 'approved'
            ) AS approved_registration_count,
            (
                SELECT COUNT(*)::int
                FROM registrations r
                WHERE r.seminar_id = s.id AND r.status = 'pending'
            ) AS pending_registration_count,
            (
                SELECT COUNT(*)::int
                FROM registrations r
                WHERE r.seminar_id = s.id
            ) AS total_registration_count
            FROM seminaires s
            ORDER BY s.date ASC
        `);
        return result.rows;
    }

    async getSeminaireById(id) {
        const result = await this.pool.query(
            `
                SELECT s.*,
                (
                    SELECT COUNT(*)::int
                        FROM registrations r
                    WHERE r.seminar_id = s.id AND r.status = 'approved'
                ) AS registration_count,
                (
                    SELECT COUNT(*)::int
                        FROM registrations r
                    WHERE r.seminar_id = s.id AND r.status = 'approved'
                ) AS approved_registration_count,
                (
                    SELECT COUNT(*)::int
                        FROM registrations r
                    WHERE r.seminar_id = s.id AND r.status = 'pending'
                ) AS pending_registration_count,
                (
                    SELECT COUNT(*)::int
                        FROM registrations r
                    WHERE r.seminar_id = s.id
                ) AS total_registration_count
                FROM seminaires s
                WHERE s.id = $1
            `,
            [id]
        );
        return result.rows[0] || null;
    }

        async getSeminaireQuestions(seminarId, includeInactive = false) {
            const params = [seminarId];
            const inactiveFilter = includeInactive ? '' : 'AND is_active = true';
            const result = await this.pool.query(
                `
                    SELECT *
                    FROM seminar_questions
                    WHERE seminar_id = $1 ${inactiveFilter}
                    ORDER BY sort_order ASC, id ASC
                `,
                params
            );
            return result.rows;
        }

        async createSeminaireQuestion(seminarId, payload) {
            const result = await this.pool.query(
                `
                    INSERT INTO seminar_questions (
                        seminar_id, question_key, label, description, field_type,
                        is_required, sort_order, is_active, placeholder, help_text,
                        options_json, validation_json, allow_multiple_files,
                        max_files, max_file_size_mb, allowed_mime_types_json
                    ) VALUES (
                        $1, $2, $3, $4, $5,
                        $6, $7, $8, $9, $10,
                        $11::jsonb, $12::jsonb, $13,
                        $14, $15, $16::jsonb
                    )
                    RETURNING *
                `,
                [
                    seminarId,
                    payload.question_key,
                    payload.label,
                    payload.description,
                    payload.field_type,
                    payload.is_required,
                    payload.sort_order,
                    payload.is_active,
                    payload.placeholder,
                    payload.help_text,
                    payload.options_json ? JSON.stringify(payload.options_json) : null,
                    payload.validation_json ? JSON.stringify(payload.validation_json) : null,
                    payload.allow_multiple_files,
                    payload.max_files,
                    payload.max_file_size_mb,
                    payload.allowed_mime_types_json ? JSON.stringify(payload.allowed_mime_types_json) : null
                ]
            );
            return result.rows[0];
        }

        async updateSeminaireQuestion(seminarId, questionId, payload) {
            const result = await this.pool.query(
                `
                    UPDATE seminar_questions
                    SET question_key = $1,
                        label = $2,
                        description = $3,
                        field_type = $4,
                        is_required = $5,
                        sort_order = $6,
                        is_active = $7,
                        placeholder = $8,
                        help_text = $9,
                        options_json = $10::jsonb,
                        validation_json = $11::jsonb,
                        allow_multiple_files = $12,
                        max_files = $13,
                        max_file_size_mb = $14,
                        allowed_mime_types_json = $15::jsonb,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE seminar_id = $16 AND id = $17
                    RETURNING *
                `,
                [
                    payload.question_key,
                    payload.label,
                    payload.description,
                    payload.field_type,
                    payload.is_required,
                    payload.sort_order,
                    payload.is_active,
                    payload.placeholder,
                    payload.help_text,
                    payload.options_json ? JSON.stringify(payload.options_json) : null,
                    payload.validation_json ? JSON.stringify(payload.validation_json) : null,
                    payload.allow_multiple_files,
                    payload.max_files,
                    payload.max_file_size_mb,
                    payload.allowed_mime_types_json ? JSON.stringify(payload.allowed_mime_types_json) : null,
                    seminarId,
                    questionId
                ]
            );
            return result.rows[0] || null;
        }

        async reorderSeminaireQuestions(seminarId, orderedQuestionIds) {
            await this.pool.query('BEGIN');
            try {
                for (let i = 0; i < orderedQuestionIds.length; i += 1) {
                    await this.pool.query(
                        'UPDATE seminar_questions SET sort_order = $1, updated_at = CURRENT_TIMESTAMP WHERE seminar_id = $2 AND id = $3',
                        [i, seminarId, orderedQuestionIds[i]]
                    );
                }
                await this.pool.query('COMMIT');
            } catch (error) {
                await this.pool.query('ROLLBACK');
                throw error;
            }
        }

        async deactivateSeminaireQuestion(seminarId, questionId) {
            const result = await this.pool.query(
                'UPDATE seminar_questions SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE seminar_id = $1 AND id = $2',
                [seminarId, questionId]
            );
            return { changes: result.rowCount };
        }

        async replaceSeminaireQuestions(seminarId, questions) {
            await this.pool.query('BEGIN');
            try {
                await this.pool.query('DELETE FROM seminar_questions WHERE seminar_id = $1', [seminarId]);
                for (let i = 0; i < questions.length; i += 1) {
                    const payload = {
                        ...questions[i],
                        sort_order: i,
                        is_active: questions[i].is_active === undefined ? true : questions[i].is_active
                    };
                    await this.pool.query(
                        `
                            INSERT INTO seminar_questions (
                                seminar_id, question_key, label, description, field_type,
                                is_required, sort_order, is_active, placeholder, help_text,
                                options_json, validation_json, allow_multiple_files,
                                max_files, max_file_size_mb, allowed_mime_types_json
                            ) VALUES (
                                $1, $2, $3, $4, $5,
                                $6, $7, $8, $9, $10,
                                $11::jsonb, $12::jsonb, $13,
                                $14, $15, $16::jsonb
                            )
                        `,
                        [
                            seminarId,
                            payload.question_key,
                            payload.label,
                            payload.description,
                            payload.field_type,
                            payload.is_required,
                            payload.sort_order,
                            payload.is_active,
                            payload.placeholder,
                            payload.help_text,
                            payload.options_json ? JSON.stringify(payload.options_json) : null,
                            payload.validation_json ? JSON.stringify(payload.validation_json) : null,
                            payload.allow_multiple_files,
                            payload.max_files,
                            payload.max_file_size_mb,
                            payload.allowed_mime_types_json ? JSON.stringify(payload.allowed_mime_types_json) : null
                        ]
                    );
                }
                await this.pool.query('COMMIT');
            } catch (error) {
                await this.pool.query('ROLLBACK');
                throw error;
            }
        }

        async hasSeminarRegistrationByEmail(seminarId, email) {
            const result = await this.pool.query(
                `
                    SELECT 1
                    FROM registrations r
                    WHERE r.seminar_id = $1
                      AND lower(r.email) = lower($2)
                    LIMIT 1
                `,
                [seminarId, email]
            );
            return result.rowCount > 0;
        }

        async createDynamicRegistration(seminarId, candidate, answers, files) {
            await this.pool.query('BEGIN');
            try {
                const registrationRes = await this.pool.query(
                    `
                        INSERT INTO registrations (
                            seminar_id, full_name, email, phone, status,
                            answers_json, files_json
                        )
                        VALUES ($1, $2, $3, $4, 'pending', $5::jsonb, $6::jsonb)
                        RETURNING id, status
                    `,
                    [
                        seminarId,
                        candidate.full_name,
                        candidate.email,
                        candidate.phone || null,
                        JSON.stringify(answers || []),
                        JSON.stringify(files || [])
                    ]
                );

                await this.pool.query('COMMIT');
                return { id: registrationRes.rows[0].id, status: registrationRes.rows[0].status };
            } catch (error) {
                await this.pool.query('ROLLBACK');
                if (error.code === '23505') {
                    throw { duplicate: true };
                }
                throw error;
            }
        }

    async updateSeminaire(id, data) {
        const result = await this.pool.query(
            `
                UPDATE seminaires
                SET title = $1,
                    date = $2,
                    location = $3,
                    delivery_mode = $4,
                    virtual_room_url = $5,
                    description = $6,
                    capacity = $7
                WHERE id = $8
            `,
            [
                data.title,
                data.date,
                data.location,
                data.delivery_mode || 'in_person',
                data.virtual_room_url || null,
                data.description,
                data.capacity ?? null,
                id
            ]
        );
        return { changes: result.rowCount };
    }

    async toggleSeminaireOpen(id) {
        const result = await this.pool.query(
            'UPDATE seminaires SET is_open = NOT is_open WHERE id = $1',
            [id]
        );
        return { changes: result.rowCount };
    }

    async deleteSeminaire(id) {
        const result = await this.pool.query('DELETE FROM seminaires WHERE id = $1', [id]);
        return { changes: result.rowCount };
    }

    async createRegistration(seminarId, data) {
        try {
            const result = await this.pool.query(
                `
                    INSERT INTO registrations (seminar_id, full_name, email, phone)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id, status
                `,
                [seminarId, data.full_name, data.email, data.phone || null]
            );
            return { id: result.rows[0].id, status: result.rows[0].status };
        } catch (error) {
            if (error.code === '23505') {
                throw { duplicate: true };
            }
            throw error;
        }
    }

    async getRegistrationsBySeminar(seminarId) {
        const result = await this.pool.query(
            `
                SELECT r.*,
                    COALESCE(r.answers_json, '[]'::jsonb) AS answers,
                    COALESCE(r.files_json, '[]'::jsonb) AS files
                FROM registrations r
                WHERE seminar_id = $1
                ORDER BY
                    CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
                    registered_at DESC
            `,
            [seminarId]
        );
        return result.rows;
    }

    async approveRegistration(id) {
        const result = await this.pool.query(
            `
                UPDATE registrations
                SET status = 'approved',
                    approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP),
                    confirmation_email_error = NULL
                WHERE id = $1
                RETURNING *
            `,
            [id]
        );
        return result.rows[0] || null;
    }

    async getRegistrationWithSeminar(id) {
        const result = await this.pool.query(
            `
                SELECT
                    r.*,
                    COALESCE(r.answers_json, '[]'::jsonb) AS answers,
                    COALESCE(r.files_json, '[]'::jsonb) AS files,
                    s.title AS seminar_title,
                    s.date AS seminar_date,
                    s.location AS seminar_location,
                    s.delivery_mode AS seminar_delivery_mode,
                    s.virtual_room_url AS seminar_virtual_room_url,
                    s.description AS seminar_description
                FROM registrations r
                JOIN seminaires s ON s.id = r.seminar_id
                WHERE r.id = $1
            `,
            [id]
        );
        return result.rows[0] || null;
    }

    async markRegistrationEmailSent(id) {
        const result = await this.pool.query(
            `
                UPDATE registrations
                SET confirmation_email_sent_at = CURRENT_TIMESTAMP,
                    confirmation_email_error = NULL
                WHERE id = $1
            `,
            [id]
        );
        return { changes: result.rowCount };
    }

    async markRegistrationEmailError(id, errorMessage) {
        const result = await this.pool.query(
            `
                UPDATE registrations
                SET confirmation_email_error = $1
                WHERE id = $2
            `,
            [String(errorMessage || 'Erreur email').slice(0, 500), id]
        );
        return { changes: result.rowCount };
    }

    async deleteRegistration(id) {
        const result = await this.pool.query('DELETE FROM registrations WHERE id = $1', [id]);
        return { changes: result.rowCount };
    }

    async getRegistrationCount(seminarId) {
        const result = await this.pool.query(
            'SELECT COUNT(*)::int AS count FROM registrations WHERE seminar_id = $1',
            [seminarId]
        );
        return result.rows[0].count;
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            this.isConnected = false;
            console.log('✅ PostgreSQL connection pool closed');
        }
    }
}

const database = new Database();

export default database;
