const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const query = (text, params) => pool.query(text, params);

const initDb = async () => {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS entries (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                mood TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                deleted_at TIMESTAMPTZ,
                ai_summary TEXT
            );
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,
                role VARCHAR(20) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // Migration to add deleted_at if it's missing (for existing tables)
        try {
            await query(`ALTER TABLE entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;`);
        } catch (e) {
            // Ignore if column exists
        }

        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};

module.exports = { query, initDb };
