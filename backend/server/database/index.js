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
        await this.initializeTables();
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
                description TEXT,
                capacity INTEGER,
                is_open BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS registrations (
                id SERIAL PRIMARY KEY,
                seminar_id INTEGER NOT NULL REFERENCES seminaires(id) ON DELETE CASCADE,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                registered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(seminar_id, email)
            )
        `);

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
                admin_notes TEXT
            )
        `);

        console.log('📊 PostgreSQL tables ready');
    }

    parseLab(row) {
        return {
            ...row,
            researchAreas: JSON.parse(row.research_areas || '[]')
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
                coordinates_lng, research_areas, description, established_year
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
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
            labData.established_year
        ];

        const result = await this.pool.query(sql, values);
        return { id: result.rows[0].id, changes: 1 };
    }

    async getApprovedLabs(searchParams = {}) {
        let sql = `
            SELECT
                id, lab_name, institution_name, contact_email, phone, website,
                address, city, country, coordinates_lat, coordinates_lng,
                research_areas, description, established_year, submitted_at
            FROM labs
            WHERE approved = true
        `;
        const params = [];

        if (searchParams.search) {
            const term = `%${searchParams.search}%`;
            const placeholders = Array.from({ length: 7 }, () => this.nextParam(params, term));
            sql += ` AND (
                lab_name ILIKE ${placeholders[0]} OR
                institution_name ILIKE ${placeholders[1]} OR
                contact_person ILIKE ${placeholders[2]} OR
                city ILIKE ${placeholders[3]} OR
                country ILIKE ${placeholders[4]} OR
                address ILIKE ${placeholders[5]} OR
                description ILIKE ${placeholders[6]}
            )`;
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

        if (searchParams.yearFrom) {
            sql += ` AND established_year >= ${this.nextParam(params, parseInt(searchParams.yearFrom, 10))}`;
        }

        if (searchParams.yearTo) {
            sql += ` AND established_year <= ${this.nextParam(params, parseInt(searchParams.yearTo, 10))}`;
        }

        const validSortColumns = ['lab_name', 'institution_name', 'city', 'country', 'established_year', 'submitted_at'];
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
            WHERE approved = false
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
                submitted_at, approved, admin_notes
            FROM labs
            WHERE id = $1 ${includeUnapproved ? '' : 'AND approved = true'}
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
        const validFields = ['lab_name', 'institution_name', 'city', 'country', 'research_areas'];

        if (!validFields.includes(field)) {
            throw new Error('Invalid search field');
        }

        const result = await this.pool.query(
            `
                SELECT DISTINCT ${field} AS suggestion
                FROM labs
                WHERE approved = true AND ${field} ILIKE $1
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
                COUNT(DISTINCT city)::int AS cities,
                COUNT(DISTINCT institution_name)::int AS institutions,
                MIN(established_year) AS "oldestYear",
                MAX(established_year) AS "newestYear"
            FROM labs
            WHERE approved = true
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
                INSERT INTO seminaires (title, date, location, description, capacity, is_open)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `,
            [
                data.title,
                data.date,
                data.location,
                data.description,
                data.capacity ?? null,
                data.is_open ?? true
            ]
        );
        return { id: result.rows[0].id };
    }

    async getSeminaires() {
        const result = await this.pool.query(`
            SELECT s.*, (
                SELECT COUNT(*)::int
                FROM registrations r
                WHERE r.seminar_id = s.id
            ) AS registration_count
            FROM seminaires s
            ORDER BY s.date ASC
        `);
        return result.rows;
    }

    async getSeminaireById(id) {
        const result = await this.pool.query(
            `
                SELECT s.*, (
                    SELECT COUNT(*)::int
                    FROM registrations r
                    WHERE r.seminar_id = s.id
                ) AS registration_count
                FROM seminaires s
                WHERE s.id = $1
            `,
            [id]
        );
        return result.rows[0] || null;
    }

    async updateSeminaire(id, data) {
        const result = await this.pool.query(
            `
                UPDATE seminaires
                SET title = $1, date = $2, location = $3, description = $4, capacity = $5
                WHERE id = $6
            `,
            [data.title, data.date, data.location, data.description, data.capacity ?? null, id]
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
                    RETURNING id
                `,
                [seminarId, data.full_name, data.email, data.phone || null]
            );
            return { id: result.rows[0].id };
        } catch (error) {
            if (error.code === '23505') {
                throw { duplicate: true };
            }
            throw error;
        }
    }

    async getRegistrationsBySeminar(seminarId) {
        const result = await this.pool.query(
            'SELECT * FROM registrations WHERE seminar_id = $1 ORDER BY registered_at DESC',
            [seminarId]
        );
        return result.rows;
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
