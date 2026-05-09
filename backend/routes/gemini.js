const express = require('express');
const router = express.Router();
const { generateBatchRecipe, generateMealPlan, regenerateMeal } = require('../services/geminiService');

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

router.post('/meal-plan', async (req, res, next) => {
  try {
    const { startDate, endDate, peopleCount = 4, preferences = '' } = req.body;
    if (!startDate || !endDate) return res.status(400).json({ error: 'Dates de début et de fin requises' });
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const nbDays = Math.round((end - start) / 86400000) + 1;
    if (nbDays < 1 || nbDays > 14) return res.status(400).json({ error: 'Période entre 1 et 14 jours' });
    const plan = await generateMealPlan({ startDate, endDate, peopleCount, preferences });
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

router.post('/regenerate-meal', async (req, res, next) => {
  try {
    const { date, mealType, currentPlan, peopleCount = 4, preferences = '' } = req.body;
    if (!date || !mealType) return res.status(400).json({ error: 'date et mealType requis' });
    if (!['lunch', 'dinner'].includes(mealType)) return res.status(400).json({ error: 'mealType doit être lunch ou dinner' });
    if (!currentPlan?.days?.length) return res.status(400).json({ error: 'currentPlan.days requis' });
    const meal = await regenerateMeal({ date, mealType, currentPlan, peopleCount, preferences });
    res.json(meal);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
