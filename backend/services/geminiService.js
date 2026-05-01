const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `Tu es un chef cuisinier expert spécialisé dans la cuisine familiale saine.
Tu génères des recettes détaillées pour 2 adultes, avec des adaptations pour bébé quand c'est pertinent.
Réponds TOUJOURS en JSON valide, sans texte avant ou après.`;

const RECIPE_SCHEMA = `{
  "name": "string",
  "category": "string (Petit-déjeuner|Déjeuner|Dîner|Snack|Dessert)",
  "prepTime": number (minutes),
  "cookTime": number (minutes),
  "servings": 2,
  "tags": ["string"],
  "ingredients": "string (liste formatée avec quantités, une ligne par ingrédient)",
  "instructions": "string (étapes numérotées, une étape par ligne)",
  "babyAdaptation": "string (comment adapter la recette pour un bébé, ou vide si non applicable)",
  "nutritionNotes": "string (notes nutritionnelles courtes)"
}`;

async function generateRecipeSuggestion(options = {}) {
  const { excludeNames = [], preferences = '', mealType = '' } = options;

  const exclusionText = excludeNames.length
    ? `Évite ces recettes déjà connues : ${excludeNames.slice(0, 20).join(', ')}.`
    : '';

  const prefText = preferences ? `Préférences ou contraintes : ${preferences}.` : '';
  const mealText = mealType ? `Type de repas souhaité : ${mealType}.` : '';

  const prompt = `${SYSTEM_PROMPT}

Génère UNE nouvelle recette originale et savoureuse pour une famille (2 adultes, éventuellement un bébé).
${exclusionText}
${prefText}
${mealText}

Réponds uniquement avec un objet JSON respectant ce schéma :
${RECIPE_SCHEMA}`;

  // thinkingBudget: 0 disables the "thinking" mode — much faster responses
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
  });
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let recipe;
  try {
    recipe = JSON.parse(cleaned);
  } catch {
    throw new Error('Gemini returned invalid JSON: ' + cleaned.slice(0, 200));
  }

  // Assign a temporary client-side id
  recipe.id = `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  recipe.source = 'gemini';
  return recipe;
}

async function generateMultipleSuggestions(count = 3, options = {}) {
  const suggestions = [];
  const excludeNames = [...(options.excludeNames || [])];

  for (let i = 0; i < count; i++) {
    try {
      const recipe = await generateRecipeSuggestion({ ...options, excludeNames });
      suggestions.push(recipe);
      excludeNames.push(recipe.name);
      // Small delay to respect rate limits
      if (i < count - 1) await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error(`[Gemini] Error generating suggestion ${i + 1}:`, err.message);
    }
  }

  return suggestions;
}

module.exports = { generateRecipeSuggestion, generateMultipleSuggestions };
