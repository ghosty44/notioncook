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

  const prompt = `Tu es un expert en batch cooking. Génère une recette adaptée au batch cooking pour 1 personne (base) à partir de ces préférences : "${preferences}".
La recette DOIT se conserver plusieurs jours et être facile à réchauffer.
Ajoute aussi une adaptation pour un bébé de ${babyMonths} mois (sans sel ajouté, texture adaptée, ingrédients sûrs).
Réponds UNIQUEMENT avec ce JSON (sans texte autour) :
{"name":"","category":"Déjeuner|Dîner|Petit-déjeuner|Snack|Dessert|Soupe|Salade","prepTime":0,"cookTime":0,"servings":1,"tags":[],"ingredients":["ingrédient 1 avec quantité","ingrédient 2 avec quantité"],"instructions":["Étape 1 : faire ceci","Étape 2 : faire cela"],"batchFriendly":true,"storageDays":0,"storageMethod":"Frigo|Congélateur|Température ambiante","storageTips":"","babyAdaptation":"adaptation pour bébé de ${babyMonths} mois : texture, ingrédients à retirer, précautions"}`;

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

async function generateMealPlan({ startDate, endDate, peopleCount = 4, preferences = '' }) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
  });

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const nbDays = Math.round((end - start) / 86400000) + 1;
  const babyMonths = getBabyAgeMonths();

  const prefStr = preferences ? `\nContraintes / préférences : ${preferences}` : '';
  const babyStr = preferences?.toLowerCase().includes('bébé')
    ? `\nBébé de ${babyMonths} mois présent : prévoir au moins 1 repas/jour sans sel, texture douce.`
    : '';

  const prompt = `Tu es un chef expert en batch cooking. Génère un plan de repas optimisé batch cooking pour ${nbDays} jour${nbDays > 1 ? 's' : ''} (du ${startDate} au ${endDate}) pour ${peopleCount} personne${peopleCount > 1 ? 's' : ''}.${prefStr}${babyStr}

RÈGLES BATCH COOKING STRICTES :
1. Un même ingrédient (ex: poulet rôti, riz cuit, légumes grillés) DOIT servir dans 2 à 3 repas différents
2. Propose 1-2 sessions de préparation batch (idéalement la veille ou le week-end) qui regroupent les cuissons longues
3. La cuisson quotidienne doit être inférieure à 20 min/jour une fois le batch fait
4. Varie les saveurs malgré les bases communes : même ingrédient → plats différents
5. Adapte toutes les quantités pour ${peopleCount} personne${peopleCount > 1 ? 's' : ''}

ESTIMATION DES ÉCONOMIES :
- "batchTotal" : coût total estimé de la liste de courses batch (en €, entier)
- "individualTotal" : coût estimé si on achetait les ingrédients à l'unité pour chaque repas séparément (pas de mutualisation, petits conditionnements, prix unitaires plus élevés ~30% en moyenne)
- "savings" : individualTotal - batchTotal
Utilise les prix moyens des supermarchés français (Carrefour, Leclerc) pour estimer.

Retourne UNIQUEMENT ce JSON valide, sans aucun texte autour, sans markdown :
{"days":[{"date":"YYYY-MM-DD","dayLabel":"Lundi 13 octobre","lunch":{"name":"Nom plat midi","description":"Description 1 phrase","prepTime":5,"cookTime":0,"batchNote":"Utilise X du batch dimanche"},"dinner":{"name":"Nom plat soir","description":"Description 1 phrase","prepTime":10,"cookTime":15,"batchNote":null}}],"batchSessions":[{"date":"YYYY-MM-DD","dayLabel":"Dimanche 12 octobre","label":"Préparation du dimanche","tasks":["Rôtir 800g de poulet (45 min) → utilisé lun midi + mar soir","Cuire 400g de riz (20 min) → utilisé mar bowl + jeu soir","Rôtir légumes (35 min) → utilisé lun soir + mer midi"],"totalMinutes":100}],"shoppingList":[{"name":"Blanc de poulet","quantity":"800g","category":"Viandes & Poissons"},{"name":"Riz basmati","quantity":"400g","category":"Féculents & Céréales"}],"savingsEstimate":{"batchTotal":42,"individualTotal":68,"savings":26}}

Génère maintenant le plan complet pour les ${nbDays} jours en respectant rigoureusement les règles batch cooking.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Réponse Gemini invalide : aucun JSON trouvé');

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('JSON invalide dans la réponse Gemini');
  }
}

async function regenerateMeal({ date, mealType, currentPlan, peopleCount = 4, preferences = '' }) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
  });

  const otherMeals = currentPlan.days.flatMap((d) => [
    d.date !== date || mealType !== 'lunch' ? d.lunch?.name : null,
    d.date !== date || mealType !== 'dinner' ? d.dinner?.name : null,
  ]).filter(Boolean);

  const batchBases = currentPlan.batchSessions?.flatMap((s) => s.tasks).slice(0, 5) ?? [];
  const prefStr = preferences ? `\nContraintes / préférences : ${preferences}` : '';
  const mealLabel = mealType === 'lunch' ? 'midi' : 'soir';
  const day = currentPlan.days.find((d) => d.date === date);
  const dayLabel = day?.dayLabel || date;

  const prompt = `Tu es un chef expert en batch cooking. Le plan de repas actuel inclut ces plats : ${otherMeals.slice(0, 10).join(', ')}.
Sessions batch existantes : ${batchBases.join(' | ')}.${prefStr}

Génère UN SEUL repas pour le ${mealLabel} du ${dayLabel} (${date}), pour ${peopleCount} personne${peopleCount > 1 ? 's' : ''}, différent de tous les plats existants mais cohérent avec les bases batch déjà préparées.

Réponds UNIQUEMENT avec ce JSON (sans texte autour) :
{"name":"","description":"Description 1 phrase","prepTime":0,"cookTime":0,"batchNote":"Comment ce plat utilise les bases batch, ou null"}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Réponse Gemini invalide');
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('JSON invalide dans la réponse Gemini');
  }
}

async function expandMeal({ name, description, batchNote, prepTime, cookTime, peopleCount = 4, preferences = '' }) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
  });

  const babyMonths = getBabyAgeMonths();
  const prefStr = preferences ? `\nContraintes / préférences : ${preferences}` : '';
  const contextLines = [
    description ? `Description : ${description}` : '',
    batchNote ? `Note batch : ${batchNote}` : '',
  ].filter(Boolean).join('\n');

  const prompt = `Tu es un chef expert en batch cooking. Développe la recette complète pour "${name}" pour ${peopleCount} personne${peopleCount > 1 ? 's' : ''}.
${contextLines}${prefStr}

La recette doit être optimisée batch cooking, se conserver plusieurs jours, et toutes les quantités doivent être adaptées pour ${peopleCount} personne${peopleCount > 1 ? 's' : ''}.
Ajoute aussi une adaptation pour un bébé de ${babyMonths} mois (sans sel ajouté, texture adaptée, ingrédients sûrs).

Réponds UNIQUEMENT avec ce JSON (sans texte autour) :
{"name":"","category":"Déjeuner|Dîner|Petit-déjeuner|Snack|Dessert|Soupe|Salade","prepTime":0,"cookTime":0,"servings":${peopleCount},"tags":[],"ingredients":["ingrédient 1 avec quantité pour ${peopleCount} personnes","ingrédient 2 avec quantité"],"instructions":["Étape 1 : faire ceci","Étape 2 : faire cela","Étape 3 : faire autre chose"],"batchFriendly":true,"storageDays":0,"storageMethod":"Frigo|Congélateur|Température ambiante","storageTips":"","babyAdaptation":"adaptation pour bébé de ${babyMonths} mois : texture, ingrédients à retirer, précautions","batchNote":"reprendre ou compléter la note batch, ou null si aucune"}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Réponse Gemini invalide');

  let recipe;
  try {
    recipe = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('JSON invalide dans la réponse Gemini');
  }

  if (Array.isArray(recipe.ingredients)) recipe.ingredients = recipe.ingredients.join('\n');
  if (Array.isArray(recipe.instructions)) recipe.instructions = recipe.instructions.join('\n');

  recipe.id = `expanded-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  recipe.source = 'gemini';
  recipe.servings = peopleCount;
  return recipe;
}

async function generatePlatingSteps({ name, description }) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
  });

  const context = description ? ` (${description})` : '';
  const prompt = `Tu es un chef cuisinier. Donne 3 à 5 étapes courtes pour dresser et présenter le plat "${name}"${context} de façon appétissante.
Réponds UNIQUEMENT avec ce JSON (sans texte autour) :
{"steps":["Étape 1 : ...","Étape 2 : ...","Étape 3 : ..."]}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Réponse Gemini invalide');
  return JSON.parse(jsonMatch[0]);
}

module.exports = { generateBatchRecipe, generateMealPlan, regenerateMeal, expandMeal, generatePlatingSteps };
