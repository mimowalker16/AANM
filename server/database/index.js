import sqlite3 from 'sqlite3';
import { config } from '../config/index.js';

class Database {
    constructor() {
        this.db = null;
        this.isConnected = false;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(config.database.url, (err) => {
                if (err) {
                    console.error('Error connecting to database:', err);
                    reject(err);
                } else {
                    console.log(`✅ Connected to SQLite database: ${config.database.url}`);
                    this.isConnected = true;
                    this.initializeTables();
                    resolve();
                }
            });
        });
    }

    initializeTables() {
        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS seminaires (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    date TEXT NOT NULL,
                    location TEXT,
                    description TEXT,
                    capacity INTEGER,
                    is_open INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) console.error('Error creating seminaires table:', err);
                else console.log('📅 Seminaires table ready');
            });

            this.db.run(`
                CREATE TABLE IF NOT EXISTS registrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    seminar_id INTEGER NOT NULL REFERENCES seminaires(id) ON DELETE CASCADE,
                    full_name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    phone TEXT,
                    registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(seminar_id, email)
                )
            `, (err) => {
                if (err) console.error('Error creating registrations table:', err);
                else console.log('📋 Registrations table ready');
            });

            this.db.run(`
                CREATE TABLE IF NOT EXISTS labs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    lab_name TEXT NOT NULL,
                    institution_name TEXT,
                    contact_person TEXT NOT NULL,
                    contact_email TEXT NOT NULL,
                    phone TEXT,
                    website TEXT,
                    address TEXT NOT NULL,
                    city TEXT NOT NULL,
                    country TEXT NOT NULL,
                    coordinates_lat REAL NOT NULL,
                    coordinates_lng REAL NOT NULL,
                    research_areas TEXT NOT NULL,
                    description TEXT,
                    established_year INTEGER,
                    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    approved BOOLEAN DEFAULT 0,
                    admin_notes TEXT
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating labs table:', err);
                } else {
                    console.log('📊 Labs table ready');
                }
            });
        });
    }

    // Lab operations
    createLab(labData) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO labs (
                    lab_name, institution_name, contact_person, contact_email, 
                    phone, website, address, city, country, coordinates_lat, 
                    coordinates_lng, research_areas, description, established_year
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

            this.db.run(sql, values, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    getApprovedLabs(searchParams = {}) {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT 
                    id, lab_name, institution_name, contact_email, phone, website,
                    address, city, country, coordinates_lat, coordinates_lng,
                    research_areas, description, established_year, submitted_at
                FROM labs 
                WHERE approved = 1
            `;
            let params = [];
            
            // Search query
            if (searchParams.search) {
                sql += ` AND (
                    lab_name LIKE ? OR 
                    institution_name LIKE ? OR 
                    contact_person LIKE ? OR 
                    city LIKE ? OR 
                    country LIKE ? OR 
                    address LIKE ? OR 
                    description LIKE ?
                )`;
                const searchTerm = `%${searchParams.search}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
            }
            
            // Country filter
            if (searchParams.country) {
                sql += ` AND country = ?`;
                params.push(searchParams.country);
            }
            
            // City filter
            if (searchParams.city) {
                sql += ` AND city LIKE ?`;
                params.push(`%${searchParams.city}%`);
            }
            
            // Institution filter
            if (searchParams.institution) {
                sql += ` AND institution_name LIKE ?`;
                params.push(`%${searchParams.institution}%`);
            }
            
            // Research area filter
            if (searchParams.researchArea) {
                sql += ` AND research_areas LIKE ?`;
                params.push(`%${searchParams.researchArea}%`);
            }
            
            // Establishment year range
            if (searchParams.yearFrom) {
                sql += ` AND established_year >= ?`;
                params.push(parseInt(searchParams.yearFrom));
            }
            
            if (searchParams.yearTo) {
                sql += ` AND established_year <= ?`;
                params.push(parseInt(searchParams.yearTo));
            }
            
            // Sorting
            const validSortColumns = ['lab_name', 'institution_name', 'city', 'country', 'established_year', 'submitted_at'];
            const sortBy = validSortColumns.includes(searchParams.sortBy) ? searchParams.sortBy : 'submitted_at';
            const sortOrder = searchParams.sortOrder === 'asc' ? 'ASC' : 'DESC';
            sql += ` ORDER BY ${sortBy} ${sortOrder}`;
            
            // Pagination
            if (searchParams.limit) {
                sql += ` LIMIT ?`;
                params.push(parseInt(searchParams.limit));
                
                if (searchParams.offset) {
                    sql += ` OFFSET ?`;
                    params.push(parseInt(searchParams.offset));
                }
            }

            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const labs = rows.map(lab => ({
                        ...lab,
                        researchAreas: JSON.parse(lab.research_areas)
                    }));
                    resolve(labs);
                }
            });
        });
    }

    getPendingLabs() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM labs 
                WHERE approved = 0 
                ORDER BY submitted_at DESC
            `;

            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const labs = rows.map(lab => ({
                        ...lab,
                        researchAreas: JSON.parse(lab.research_areas)
                    }));
                    resolve(labs);
                }
            });
        });
    }

    getLabById(labId, includeUnapproved = false) {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT 
                    id, lab_name, institution_name, contact_person, contact_email, 
                    phone, website, address, city, country, coordinates_lat, 
                    coordinates_lng, research_areas, description, established_year, 
                    submitted_at, approved, admin_notes
                FROM labs 
                WHERE id = ?
            `;
            
            // Only include approved labs unless specifically requested
            if (!includeUnapproved) {
                sql += ` AND approved = 1`;
            }

            this.db.get(sql, [labId], (err, row) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    resolve(null);
                } else {
                    const lab = {
                        ...row,
                        researchAreas: JSON.parse(row.research_areas)
                    };
                    resolve(lab);
                }
            });
        });
    }

    approveLab(labId, adminNotes = null) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE labs SET approved = 1, admin_notes = ? WHERE id = ?`;

            this.db.run(sql, [adminNotes, labId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // Get search suggestions for autocomplete
    getSearchSuggestions(field, query, limit = 10) {
        return new Promise((resolve, reject) => {
            const validFields = ['lab_name', 'institution_name', 'city', 'country'];
            
            if (!validFields.includes(field)) {
                reject(new Error('Invalid search field'));
                return;
            }
            
            const sql = `
                SELECT DISTINCT ${field} as suggestion
                FROM labs 
                WHERE approved = 1 AND ${field} LIKE ?
                ORDER BY ${field}
                LIMIT ?
            `;

            this.db.all(sql, [`%${query}%`, limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => row.suggestion));
                }
            });
        });
    }

    // Get search statistics
    getSearchStats() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(*) as total,
                    COUNT(DISTINCT country) as countries,
                    COUNT(DISTINCT city) as cities,
                    COUNT(DISTINCT institution_name) as institutions,
                    MIN(established_year) as oldestYear,
                    MAX(established_year) as newestYear
                FROM labs 
                WHERE approved = 1
            `;

            this.db.get(sql, [], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    deleteLab(labId) {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM labs WHERE id = ?`;

            this.db.run(sql, [labId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // ─── Seminaire operations ────────────────────────────────────────────────

    createSeminaire(data) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO seminaires (title, date, location, description, capacity, is_open)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            this.db.run(sql, [data.title, data.date, data.location, data.description, data.capacity ?? null, data.is_open ?? 1], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            });
        });
    }

    getSeminaires() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT s.*, (SELECT COUNT(*) FROM registrations r WHERE r.seminar_id = s.id) AS registration_count
                FROM seminaires s ORDER BY s.date ASC
            `;
            this.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getSeminaireById(id) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT s.*, (SELECT COUNT(*) FROM registrations r WHERE r.seminar_id = s.id) AS registration_count
                FROM seminaires s WHERE s.id = ?
            `;
            this.db.get(sql, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row || null);
            });
        });
    }

    updateSeminaire(id, data) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE seminaires SET title=?, date=?, location=?, description=?, capacity=? WHERE id=?
            `;
            this.db.run(sql, [data.title, data.date, data.location, data.description, data.capacity ?? null, id], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    }

    toggleSeminaireOpen(id) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE seminaires SET is_open = CASE WHEN is_open = 1 THEN 0 ELSE 1 END WHERE id = ?`;
            this.db.run(sql, [id], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    }

    deleteSeminaire(id) {
        return new Promise((resolve, reject) => {
            this.db.run(`DELETE FROM seminaires WHERE id = ?`, [id], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    }

    // ─── Registration operations ─────────────────────────────────────────────

    createRegistration(seminarId, data) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO registrations (seminar_id, full_name, email, phone) VALUES (?, ?, ?, ?)`;
            this.db.run(sql, [seminarId, data.full_name, data.email, data.phone || null], function(err) {
                if (err) {
                    if (err.code === 'SQLITE_CONSTRAINT') reject({ duplicate: true });
                    else reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
        });
    }

    getRegistrationsBySeminar(seminarId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM registrations WHERE seminar_id = ? ORDER BY registered_at DESC`,
                [seminarId],
                (err, rows) => { if (err) reject(err); else resolve(rows); }
            );
        });
    }

    deleteRegistration(id) {
        return new Promise((resolve, reject) => {
            this.db.run(`DELETE FROM registrations WHERE id = ?`, [id], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    }

    getRegistrationCount(seminarId) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT COUNT(*) AS count FROM registrations WHERE seminar_id = ?`, [seminarId], (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                        reject(err);
                    } else {
                        console.log('✅ Database connection closed');
                        this.isConnected = false;
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

// Create singleton instance
const database = new Database();

export default database;