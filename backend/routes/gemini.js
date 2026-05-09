const express = require('express');
const router = express.Router();
const { generateBatchRecipe } = require('../services/geminiService');

router.post('/generate', async (req, res, next) => {
  try {
    const { preferences, count = 1 } = req.body;
    if (!preferences?.trim()) return res.status(400).json({ error: 'Donnez des préférences de recette' });
    const recipes = await Promise.all(
      Array.from({ length: Math.min(count, 4) }, () => generateBatchRecipe(preferences.trim()))
    );
    res.json(recipes);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
