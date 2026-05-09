const express = require('express');
const router = express.Router();

let session = { entries: [], updatedAt: null };

router.get('/', (_req, res) => {
  res.json(session);
});

router.put('/', (req, res) => {
  const { entries } = req.body;
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'entries must be an array' });
  session = { entries, updatedAt: new Date().toISOString() };
  res.json(session);
});

router.delete('/', (_req, res) => {
  session = { entries: [], updatedAt: null };
  res.json({ ok: true });
});

module.exports = router;
