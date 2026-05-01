const express = require('express');
const router = express.Router();
const { generateRecipeSuggestion, generateMultipleSuggestions } = require('../services/geminiService');

router.post('/suggest', async (req, res, next) => {
  try {
    const { excludeNames, preferences, mealType } = req.body;
    const recipe = await generateRecipeSuggestion({ excludeNames, preferences, mealType });
    res.json(recipe);
  } catch (err) {
    next(err);
  }
});

router.post('/suggest-multiple', async (req, res, next) => {
  try {
    const { count = 3, excludeNames, preferences, mealType } = req.body;
    const clampedCount = Math.min(Math.max(1, count), 5);
    const recipes = await generateMultipleSuggestions(clampedCount, { excludeNames, preferences, mealType });
    res.json(recipes);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
