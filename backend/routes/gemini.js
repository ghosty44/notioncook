const express = require('express');
const router = express.Router();
const { generateRecipeFromIdea } = require('../services/geminiService');

router.post('/generate', async (req, res, next) => {
  try {
    const { idea } = req.body;
    if (!idea?.trim()) return res.status(400).json({ error: 'Donnez une idée de recette' });
    const recipe = await generateRecipeFromIdea(idea.trim());
    res.json(recipe);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
