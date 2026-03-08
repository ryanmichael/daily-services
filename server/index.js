const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { parseServicePage } = require('./parser');

const app = express();
const PORT = process.env.PORT || 3001;

// Disk cache directory
const CACHE_DIR = path.join(__dirname, 'cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

app.use(cors());
app.use(express.json());

// Serve built frontend from client/dist in production
const DIST_DIR = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
}

const SERVICE_TYPES = {
  ve: 'Vespers',
  ma: 'Matins',
  li: 'Divine Liturgy',
};

function buildGOAUrl(date, type) {
  // date: YYYY-MM-DD, type: ve | ma | li
  const [year, month, day] = date.split('-');
  return `https://dcs.goarch.org/goa/dcs/h/s/${year}/${month}/${day}/${type}/gr-en/index.html`;
}

function cacheKey(date, type) {
  return path.join(CACHE_DIR, `${date}-${type}.json`);
}

function readCache(date, type) {
  const file = cacheKey(date, type);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeCache(date, type, data) {
  const file = cacheKey(date, type);
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Cache write error:', err.message);
  }
}

app.get('/api/service', async (req, res) => {
  const { date, type } = req.query;

  // Validate params
  if (!date || !type) {
    return res.status(400).json({ error: 'date and type query parameters are required.' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be in YYYY-MM-DD format.' });
  }
  if (!SERVICE_TYPES[type]) {
    return res.status(400).json({ error: 'type must be one of: ve, ma, li.' });
  }

  // Check disk cache first
  const cached = readCache(date, type);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  const url = buildGOAUrl(date, type);
  console.log(`Fetching: ${url}`);

  let html;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      timeout: 15000,
    });

    if (response.status === 404) {
      return res.status(404).json({
        error: 'Service text not available for this date. The GOA site may not have content for this day yet.',
      });
    }

    if (!response.ok) {
      return res.status(502).json({
        error: `GOA site returned an error (HTTP ${response.status}). Please try again later.`,
      });
    }

    html = await response.text();
  } catch (err) {
    console.error('Fetch error:', err.message);
    return res.status(502).json({
      error: 'Service text not available for this date. The GOA site may not have content for this day yet.',
    });
  }

  let blocks;
  try {
    blocks = parseServicePage(html);
  } catch (err) {
    console.error('Parse error:', err.message);
    return res.status(500).json({ error: 'Failed to parse service text. Please try again.' });
  }

  if (!blocks || blocks.length === 0) {
    return res.status(404).json({
      error: 'Service text not available for this date. The GOA site may not have content for this day yet.',
    });
  }

  const payload = {
    date,
    type,
    serviceTitle: SERVICE_TYPES[type],
    url,
    blocks,
    cached: false,
  };

  writeCache(date, type, payload);
  res.json(payload);
});

// Health check
app.get('/api/health', (_, res) => res.json({ ok: true }));

// SPA fallback (production)
if (fs.existsSync(DIST_DIR)) {
  app.get('*', (_, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Daily Services server running on http://localhost:${PORT}`);
});
