const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Compact prompt — fewer tokens = faster response
function buildPrompt(options = {}) {
  const { excludeNames = [], preferences = '', mealType = '' } = options;
  const parts = [
    'Génère UNE recette JSON pour 2 adultes (+ adaptation bébé si possible).',
    mealType && `Type: ${mealType}.`,
    preferences && `Contraintes: ${preferences}.`,
    excludeNames.length && `Évite: ${excludeNames.slice(0, 10).join(', ')}.`,
    'Réponds UNIQUEMENT avec ce JSON (aucun texte autour):',
    '{"name":"","category":"Déjeuner|Dîner|Petit-déjeuner|Snack|Dessert|Soupe|Salade","prepTime":0,"cookTime":0,"servings":2,"tags":[],"ingredients":"une ligne par ingrédient avec quantité","instructions":"étapes numérotées","babyAdaptation":"","nutritionNotes":""}',
  ].filter(Boolean);
  return parts.join('\n');
}

function getModel() {
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
  });
}

async function generateRecipeSuggestion(options = {}) {
  const model = getModel();
  const result = await model.generateContent(buildPrompt(options));
  const text = result.response.text();
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let recipe;
  try {
    recipe = JSON.parse(cleaned);
  } catch {
    throw new Error('Gemini returned invalid JSON: ' + cleaned.slice(0, 200));
  }

  // Gemini sometimes returns arrays instead of newline-separated strings
  if (Array.isArray(recipe.ingredients)) recipe.ingredients = recipe.ingredients.join('\n');
  if (Array.isArray(recipe.instructions)) recipe.instructions = recipe.instructions.join('\n');
  if (Array.isArray(recipe.tags)) recipe.tags = recipe.tags; // already correct format

  recipe.id = `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  recipe.source = 'gemini';
  return recipe;
}

// Run all suggestions in parallel — 3 × 5s serial → ~5s total
async function generateMultipleSuggestions(count = 3, options = {}) {
  const tasks = Array.from({ length: count }, (_, i) =>
    generateRecipeSuggestion({ ...options }).catch((err) => {
      console.error(`[Gemini] suggestion ${i + 1} failed:`, err.message);
      return null;
    })
  );

  const results = await Promise.all(tasks);
  return results.filter(Boolean);
}

module.exports = { generateRecipeSuggestion, generateMultipleSuggestions };
