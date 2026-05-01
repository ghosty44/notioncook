// In-memory meal plan store (for demo; replace with a DB for persistence)
const express = require('express');
const router = express.Router();

let mealPlan = {};

// GET /api/meals?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/', (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) return res.json(mealPlan);

  const filtered = {};
  Object.keys(mealPlan).forEach((date) => {
    if (date >= start && date <= end) filtered[date] = mealPlan[date];
  });
  res.json(filtered);
});

// PUT /api/meals/:date/:slot  — assign a recipe to a slot
router.put('/:date/:slot', (req, res) => {
  const { date, slot } = req.params;
  const { recipe, babyMode } = req.body;

  if (!['breakfast', 'lunch', 'dinner'].includes(slot)) {
    return res.status(400).json({ error: 'Slot invalide. Utiliser: breakfast, lunch, dinner' });
  }

  if (!mealPlan[date]) mealPlan[date] = {};
  mealPlan[date][slot] = { recipe, babyMode: !!babyMode };
  res.json(mealPlan[date][slot]);
});

// DELETE /api/meals/:date/:slot — remove a recipe from a slot
router.delete('/:date/:slot', (req, res) => {
  const { date, slot } = req.params;
  if (mealPlan[date]) {
    delete mealPlan[date][slot];
    if (Object.keys(mealPlan[date]).length === 0) delete mealPlan[date];
  }
  res.json({ ok: true });
});

// DELETE /api/meals/:date — clear all slots for a day
router.delete('/:date', (req, res) => {
  delete mealPlan[req.params.date];
  res.json({ ok: true });
});

module.exports = router;
