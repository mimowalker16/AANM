import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import pg from 'pg';

const { Pool } = pg;

const projectRoot = process.cwd();
dotenv.config({ path: path.join(projectRoot, 'backend/.env') });
dotenv.config({ path: path.join(projectRoot, 'backend/server/.env') });

const defaultSqlitePaths = [
    path.join(projectRoot, 'server/database/labs.db'),
    path.join(projectRoot, 'backend/server/database/labs.db')
];

const sqliteArg = process.argv.find((arg) => arg.startsWith('--sqlite='));
const sqlitePath = sqliteArg
    ? path.resolve(sqliteArg.split('=').slice(1).join('='))
    : defaultSqlitePaths.find((candidate) => fs.existsSync(candidate));

if (!sqlitePath || !fs.existsSync(sqlitePath)) {
    console.error('SQLite database not found. Pass --sqlite=/path/to/labs.db');
    process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
    console.error('PostgreSQL DATABASE_URL is required. Example: postgres://user:password@host:5432/aanm');
    process.exit(1);
}

const sqlite = new sqlite3.Database(sqlitePath);
const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

function all(sql) {
    return new Promise((resolve, reject) => {
        sqlite.all(sql, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function closeSqlite() {
    return new Promise((resolve, reject) => {
        sqlite.close((err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

async function ensureSchema(client) {
    await client.query(`
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

    await client.query(`
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

    await client.query(`
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
}

async function setSequence(client, tableName) {
    await client.query(`
        SELECT setval(
            pg_get_serial_sequence('${tableName}', 'id'),
            COALESCE((SELECT MAX(id) FROM ${tableName}), 1),
            (SELECT COUNT(*) > 0 FROM ${tableName})
        )
    `);
}

async function migrate() {
    console.log(`Reading SQLite data from ${sqlitePath}`);

    const labs = await all('SELECT * FROM labs');
    const seminaires = await all('SELECT * FROM seminaires');
    const registrations = await all('SELECT * FROM registrations');

    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await ensureSchema(client);

        for (const seminar of seminaires) {
            await client.query(
                `
                    INSERT INTO seminaires (id, title, date, location, description, capacity, is_open, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamptz, CURRENT_TIMESTAMP))
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        date = EXCLUDED.date,
                        location = EXCLUDED.location,
                        description = EXCLUDED.description,
                        capacity = EXCLUDED.capacity,
                        is_open = EXCLUDED.is_open,
                        created_at = EXCLUDED.created_at
                `,
                [
                    seminar.id,
                    seminar.title,
                    seminar.date,
                    seminar.location,
                    seminar.description,
                    seminar.capacity,
                    Boolean(seminar.is_open),
                    seminar.created_at
                ]
            );
        }

        for (const lab of labs) {
            await client.query(
                `
                    INSERT INTO labs (
                        id, lab_name, institution_name, contact_person, contact_email,
                        phone, website, address, city, country, coordinates_lat,
                        coordinates_lng, research_areas, description, established_year,
                        submitted_at, approved, admin_notes
                    )
                    VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                        $13, $14, $15, COALESCE($16::timestamptz, CURRENT_TIMESTAMP), $17, $18
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        lab_name = EXCLUDED.lab_name,
                        institution_name = EXCLUDED.institution_name,
                        contact_person = EXCLUDED.contact_person,
                        contact_email = EXCLUDED.contact_email,
                        phone = EXCLUDED.phone,
                        website = EXCLUDED.website,
                        address = EXCLUDED.address,
                        city = EXCLUDED.city,
                        country = EXCLUDED.country,
                        coordinates_lat = EXCLUDED.coordinates_lat,
                        coordinates_lng = EXCLUDED.coordinates_lng,
                        research_areas = EXCLUDED.research_areas,
                        description = EXCLUDED.description,
                        established_year = EXCLUDED.established_year,
                        submitted_at = EXCLUDED.submitted_at,
                        approved = EXCLUDED.approved,
                        admin_notes = EXCLUDED.admin_notes
                `,
                [
                    lab.id,
                    lab.lab_name,
                    lab.institution_name,
                    lab.contact_person,
                    lab.contact_email,
                    lab.phone,
                    lab.website,
                    lab.address,
                    lab.city,
                    lab.country,
                    lab.coordinates_lat,
                    lab.coordinates_lng,
                    lab.research_areas,
                    lab.description,
                    lab.established_year,
                    lab.submitted_at,
                    Boolean(lab.approved),
                    lab.admin_notes
                ]
            );
        }

        for (const registration of registrations) {
            await client.query(
                `
                    INSERT INTO registrations (id, seminar_id, full_name, email, phone, registered_at)
                    VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, CURRENT_TIMESTAMP))
                    ON CONFLICT (id) DO UPDATE SET
                        seminar_id = EXCLUDED.seminar_id,
                        full_name = EXCLUDED.full_name,
                        email = EXCLUDED.email,
                        phone = EXCLUDED.phone,
                        registered_at = EXCLUDED.registered_at
                `,
                [
                    registration.id,
                    registration.seminar_id,
                    registration.full_name,
                    registration.email,
                    registration.phone,
                    registration.registered_at
                ]
            );
        }

        await setSequence(client, 'seminaires');
        await setSequence(client, 'labs');
        await setSequence(client, 'registrations');
        await client.query('COMMIT');

        console.log('Migration complete');
        console.table({
            labs: labs.length,
            seminaires: seminaires.length,
            registrations: registrations.length
        });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
        await pool.end();
        await closeSqlite();
    }
}

migrate().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
});
