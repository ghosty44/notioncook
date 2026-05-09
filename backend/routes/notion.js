const express = require('express');
const router = express.Router();
const { getAllRecipes, getRecipeById, createRecipe, searchRecipes } = require('../services/notionService');

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

module.exports = router;
