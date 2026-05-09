const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateBatchRecipe(preferences) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
  });

  const prompt = `Tu es un expert en batch cooking. Génère une recette adaptée au batch cooking pour 4-6 portions à partir de ces préférences : "${preferences}".
La recette DOIT être adaptée à la préparation en grande quantité, se conserver plusieurs jours et être facile à réchauffer.
Réponds UNIQUEMENT avec ce JSON (sans texte autour) :
{"name":"","category":"Déjeuner|Dîner|Petit-déjeuner|Snack|Dessert|Soupe|Salade","prepTime":0,"cookTime":0,"servings":4,"tags":[],"ingredients":"une ligne par ingrédient avec quantité","instructions":"étapes numérotées, une par ligne","batchFriendly":true,"storageDays":0,"storageMethod":"Frigo|Congélateur|Température ambiante","storageTips":""}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let recipe;
  try {
    recipe = JSON.parse(cleaned);
  } catch {
    throw new Error('Réponse Gemini invalide : ' + cleaned.slice(0, 200));
  }

  if (Array.isArray(recipe.ingredients)) recipe.ingredients = recipe.ingredients.join('\n');
  if (Array.isArray(recipe.instructions)) recipe.instructions = recipe.instructions.join('\n');

  recipe.id = `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  recipe.source = 'gemini';
  return recipe;
}

module.exports = { generateBatchRecipe };
