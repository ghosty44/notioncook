const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const BABY_BIRTH = new Date('2025-03-05');

function getBabyAgeMonths() {
  return Math.floor((Date.now() - BABY_BIRTH.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}

async function generateBatchRecipe(preferences) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
  });

  const babyMonths = getBabyAgeMonths();

  const prompt = `Tu es un expert en batch cooking. Génère une recette adaptée au batch cooking pour 1 personne (base) à partir de ces préférences : "${preferences}".
La recette DOIT se conserver plusieurs jours et être facile à réchauffer.
Ajoute aussi une adaptation pour un bébé de ${babyMonths} mois (sans sel ajouté, texture adaptée, ingrédients sûrs).
Réponds UNIQUEMENT avec ce JSON (sans texte autour) :
{"name":"","category":"Déjeuner|Dîner|Petit-déjeuner|Snack|Dessert|Soupe|Salade","prepTime":0,"cookTime":0,"servings":1,"tags":[],"ingredients":"une ligne par ingrédient avec quantité","instructions":"étapes numérotées, une par ligne","batchFriendly":true,"storageDays":0,"storageMethod":"Frigo|Congélateur|Température ambiante","storageTips":"","babyAdaptation":"adaptation pour bébé de ${babyMonths} mois : texture, ingrédients à retirer, précautions"}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let recipe;
  try {
    recipe = JSON.parse(cleaned);
  } catch {
    throw new Error('Réponse Gemini invalide : ' + cleaned.slice(0, 200));
  }

  if (Array.isArray(recipe.ingredients)) recipe.ingredients = recipe.ingredients.join('\n');
  if (Array.isArray(recipe.instructions)) recipe.instructions = recipe.instructions.join('\n');

  recipe.id = `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  recipe.source = 'gemini';
  return recipe;
}

module.exports = { generateBatchRecipe };
