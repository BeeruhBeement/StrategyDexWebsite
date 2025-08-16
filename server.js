const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const ANALYSIS_PATH = path.join(__dirname, 'api', 'analyses.json');
const LOG_PATH = path.join(__dirname, 'api', 'analysis-log.json');
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'changethis'; // Change this

// Get analysis for a Pokémon
app.get('/api/analysis/:pokemon', (req, res) => {
    const data = JSON.parse(fs.readFileSync(ANALYSIS_PATH, 'utf8'));
    const key = req.params.pokemon.toLowerCase();
    // Return only html (no importable)
    res.json({ analysis: data[key] ? { html: data[key].html || '' } : { html: '' } });
});

// Save analysis (admin only, with logging)
app.post('/api/analysis/:pokemon', (req, res) => {
    const { secret, author, html } = req.body;
    if (secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });
    const data = JSON.parse(fs.readFileSync(ANALYSIS_PATH, 'utf8'));
    const logData = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
    const key = req.params.pokemon.toLowerCase();
    const prev = data[key] ? { html: data[key].html || '' } : { html: '' };
    // Save new analysis (no importable)
    data[key] = { html: html || '' };
    fs.writeFileSync(ANALYSIS_PATH, JSON.stringify(data, null, 2));
    // Log the edit (no importable)
    logData.log.push({
        pokemon: key,
        author: author || 'Unknown',
        timestamp: new Date().toISOString(),
        prev,
        next: data[key]
    });
    fs.writeFileSync(LOG_PATH, JSON.stringify(logData, null, 2));
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
