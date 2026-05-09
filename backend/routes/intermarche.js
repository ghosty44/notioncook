const express = require('express');
const router = express.Router();

const API_KEY = process.env.INTERMARCHE_API_KEY || '';
const API_BASE = process.env.INTERMARCHE_API_BASE || 'https://api.intermarche.com';

const API_PENDING = !API_KEY || !process.env.INTERMARCHE_API_BASE;

function headers(userToken) {
  const h = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'x-api-key': API_KEY,
  };
  if (userToken) h['x-user-token'] = userToken;
  return h;
}

function apiError(err, res) {
  const status = err.status || 502;
  const message = err.message || 'Erreur API Intermarché';
  res.status(status).json({ error: message, pending: API_PENDING });
}

// GET /api/intermarche/status
router.get('/status', (_req, res) => {
  res.json({ configured: !API_PENDING, apiKey: API_KEY ? '***' : null });
});

// GET /api/intermarche/stores?q=
// TODO: update path once API Stores v1 is approved
router.get('/stores', async (req, res) => {
  try {
    const { q = '' } = req.query;
    const url = `${API_BASE}/v1/stores?${new URLSearchParams({ q, pageSize: 20 })}`;
    const resp = await fetch(url, { headers: headers() });
    if (!resp.ok) throw { status: resp.status, message: await resp.text() };
    const data = await resp.json();
    res.json(data);
  } catch (err) { apiError(err, res); }
});

// POST /api/intermarche/auth
// TODO: update path once API Users v1 is approved
router.post('/auth', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
    const url = `${API_BASE}/v1/users/sessions`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ username: email, password }),
    });
    if (!resp.ok) throw { status: resp.status, message: await resp.text() };
    const data = await resp.json();
    res.json(data);
  } catch (err) { apiError(err, res); }
});

// POST /api/intermarche/cart
// TODO: update path once API Carts v1 is approved
router.post('/cart', async (req, res) => {
  try {
    const { storeId, userToken } = req.body;
    const url = `${API_BASE}/v1/carts`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: headers(userToken),
      body: JSON.stringify({ catalogId: storeId }),
    });
    if (!resp.ok) throw { status: resp.status, message: await resp.text() };
    const data = await resp.json();
    res.json(data);
  } catch (err) { apiError(err, res); }
});

// POST /api/intermarche/cart/items
// TODO: update path once API Carts v1 is approved
router.post('/cart/items', async (req, res) => {
  try {
    const { cartId, query, quantity, userToken } = req.body;
    const url = `${API_BASE}/v1/carts/${cartId}/entries`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: headers(userToken),
      body: JSON.stringify({ productQuery: query, quantity: Math.max(1, Math.ceil(quantity)) }),
    });
    if (!resp.ok) throw { status: resp.status, message: await resp.text() };
    const data = await resp.json();
    res.json(data);
  } catch (err) { apiError(err, res); }
});

module.exports = router;
