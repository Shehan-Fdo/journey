const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { query, initDb } = require('../src/db');
require('dotenv').config();

const app = express();

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

// AI Chat Endpoint
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        // Fetch journal entries for context
        const entriesResult = await query(
            'SELECT content, created_at FROM entries WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 50'
        );

        const context = entriesResult.rows.map(e => `[${new Date(e.created_at).toLocaleDateString()}] ${e.content}`).join('\n\n');

        const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: 'mistral-large-latest',
                messages: [
                    {
                        role: 'system',
                        content: `You're JRN AI, a friendly, slightly casual assistant designed to interact with its user about their personal thoughts, moods, and diary entries. You're reflective, understanding, and can summarize or comment naturally, like a real-life friend who remembers context over time. You sometimes joke, use casual language, or get a bit informal—but always stay supportive and insightful. You can reference past entries, notice patterns, and respond as if you understand the user's personality and style.

                        The user's journal entries are provided below as context. 
                        Use this context to answer questions about their life, patterns, or feelings they've expressed.
                        If the user writes a diary entry, respond naturally, summarizing, reflecting, or chatting casually about the entry, in a friendly, human-like way, never sounding robotic or overly formal.

                        Journal Context:
                        ${context}`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ]
            })
        });

        if (!mistralResponse.ok) {
            const error = await mistralResponse.json();
            console.error('Mistral API Error:', error);
            return res.status(500).json({ error: 'AI Service Error' });
        }

        const data = await mistralResponse.json();
        res.json({ response: data.choices[0].message.content });
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

module.exports = app;
