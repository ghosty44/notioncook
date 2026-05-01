const express = require('express');
const router = express.Router();
const { getAllRecipes, getRecipeById, createRecipe, searchRecipes } = require('../services/notionService');

router.get('/recipes', async (_req, res, next) => {
  try {
    const recipes = await getAllRecipes();
    res.json(recipes);
  } catch (err) {
    next(err);
  }
});

router.get('/recipes/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const results = await searchRecipes(q);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

router.get('/recipes/:id', async (req, res, next) => {
  try {
    const recipe = await getRecipeById(req.params.id);
    res.json(recipe);
  } catch (err) {
    next(err);
  }
});

router.post('/recipes', async (req, res, next) => {
  try {
    const { name, ingredients, instructions, prepTime, cookTime, servings, tags, category, babyAdaptation } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom de la recette est requis' });

    const created = await createRecipe({
      name, ingredients, instructions, prepTime, cookTime,
      servings: servings || 2, tags, category, babyAdaptation,
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
