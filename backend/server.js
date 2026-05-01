require('dotenv').config();
const express = require('express');
const cors = require('cors');

const notionRoutes = require('./routes/notion');
const mealsRoutes = require('./routes/meals');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '2mb' }));

app.use('/api/notion', notionRoutes);
app.use('/api/meals', mealsRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, _req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`NotionCook backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;
