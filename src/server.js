const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { query, initDb } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize DB
initDb();

// API Routes

// Get all entries (newest first, exclude deleted, with pagination)
app.get('/api/entries', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const result = await query(
            'SELECT * FROM entries WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Create new entry
app.post('/api/entries', async (req, res) => {
    const { content, mood } = req.body;
    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }
    try {
        const result = await query(
            'INSERT INTO entries (content, mood) VALUES ($1, $2) RETURNING *',
            [content, mood]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update entry
app.put('/api/entries/:id', async (req, res) => {
    const { id } = req.params;
    const { content, mood } = req.body;
    try {
        const result = await query(
            'UPDATE entries SET content = $1, mood = $2 WHERE id = $3 AND deleted_at IS NULL RETURNING *',
            [content, mood, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Soft Delete entry
app.delete('/api/entries/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query(
            'UPDATE entries SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        res.json({ message: 'Entry moved to trash', entry: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Serve Frontend
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// For Vercel, we need to export the app
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
