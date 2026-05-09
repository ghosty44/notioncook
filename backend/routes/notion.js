const express = require('express');
const router = express.Router();
const {
  getAllRecipes, getRecipeById, createRecipe, searchRecipes,
  saveMealPlan, getMealPlans, getMealPlanById,
  deleteRecipe, deleteMealPlan,
} = require('../services/notionService');

router.get('/recipes', async (_req, res, next) => {
  try { res.json(await getAllRecipes()); } catch (err) { next(err); }
});

router.get('/recipes/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    res.json(await searchRecipes(q));
  } catch (err) { next(err); }
});

router.get('/recipes/:id', async (req, res, next) => {
  try { res.json(await getRecipeById(req.params.id)); } catch (err) { next(err); }
});

router.post('/recipes', async (req, res, next) => {
  try {
    const {
      name, ingredients, instructions, prepTime, cookTime, servings,
      tags, category, batchFriendly, storageDays, storageMethod, babyAdaptation,
    } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom de la recette est requis' });
    const created = await createRecipe({
      name, ingredients, instructions, prepTime, cookTime,
      servings: servings || 1, tags, category,
      batchFriendly: batchFriendly || false,
      storageDays: storageDays || null,
      storageMethod: storageMethod || null,
      babyAdaptation: babyAdaptation || '',
    });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

router.delete('/recipes/:id', async (req, res, next) => {
  try { await deleteRecipe(req.params.id); res.json({ ok: true }); } catch (err) { next(err); }
});

router.post('/meal-plan', async (req, res, next) => {
  try {
    const { plan, startDate, endDate, peopleCount, preferences } = req.body;
    if (!plan?.days?.length) return res.status(400).json({ error: 'Plan invalide' });
    if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises' });
    const result = await saveMealPlan({ plan, startDate, endDate, peopleCount: peopleCount || 1, preferences: preferences || '' });
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.get('/meal-plans', async (_req, res, next) => {
  try { res.json(await getMealPlans()); } catch (err) { next(err); }
});

router.get('/meal-plans/:id', async (req, res, next) => {
  try { res.json(await getMealPlanById(req.params.id)); } catch (err) { next(err); }
});

router.delete('/meal-plans/:id', async (req, res, next) => {
  try { await deleteMealPlan(req.params.id); res.json({ ok: true }); } catch (err) { next(err); }
});

module.exports = router;
