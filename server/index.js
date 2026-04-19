const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data', 'worlds');

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json({ limit: '10mb' }));

const worldsRouter = require('./routes/worlds')(DATA_DIR);
app.use('/api/worlds', worldsRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`World Builder server running on http://localhost:${PORT}`);
});
