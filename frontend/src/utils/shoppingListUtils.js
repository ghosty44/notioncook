// Categorizes and consolidates ingredients from a list of planned meals

const CATEGORY_KEYWORDS = {
  'Légumes & Fruits': [
    'tomate', 'carotte', 'courgette', 'épinard', 'salade', 'poireau', 'oignon', 'ail',
    'poivron', 'champignon', 'brocoli', 'chou', 'pomme de terre', 'patate', 'betterave',
    'céleri', 'fenouil', 'artichaut', 'asperge', 'aubergine', 'concombre', 'radis',
    'pomme', 'poire', 'banane', 'orange', 'citron', 'fraise', 'framboise', 'raisin',
    'mangue', 'avocat', 'pêche', 'abricot', 'cerise', 'melon', 'pastèque',
  ],
  'Viandes & Poissons': [
    'poulet', 'bœuf', 'porc', 'veau', 'agneau', 'dinde', 'canard', 'lapin',
    'steak', 'côtelette', 'filet', 'escalope', 'haché', 'lardons', 'jambon',
    'saumon', 'thon', 'cabillaud', 'sardine', 'crevette', 'moule', 'palourde',
    'truite', 'sole', 'bar', 'dorade', 'maquereau',
  ],
  'Produits laitiers & Œufs': [
    'lait', 'beurre', 'crème', 'yaourt', 'fromage', 'gruyère', 'emmental', 'comté',
    'parmesan', 'mozzarella', 'ricotta', 'mascarpone', 'roquefort', 'camembert',
    'œuf', 'oeuf', 'crème fraîche',
  ],
  'Féculents & Céréales': [
    'pâte', 'riz', 'quinoa', 'semoule', 'boulgour', 'orge', 'épeautre',
    'pain', 'baguette', 'farine', 'maïzena', 'avoine',
    'lentille', 'pois chiche', 'haricot', 'fève',
  ],
  'Épicerie & Condiments': [
    'huile', 'vinaigre', 'moutarde', 'mayonnaise', 'ketchup', 'sauce soja',
    'sel', 'poivre', 'épice', 'herbe', 'thym', 'laurier', 'romarin', 'basilic',
    'persil', 'coriandre', 'cumin', 'paprika', 'curry', 'curcuma', 'cannelle',
    'sucre', 'miel', 'confiture', 'chocolat', 'cacao', 'vanille',
    'bouillon', 'concentré de tomate', 'tomate pelée', 'lentilles en boîte',
  ],
  'Boissons': [
    'eau', 'jus', 'lait', 'café', 'thé', 'vin', 'bière',
  ],
};

function categorizeIngredient(ingredientLine) {
  const lower = ingredientLine.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return 'Divers';
}

function parseIngredientLines(ingredientsText) {
  if (!ingredientsText) return [];
  return ingredientsText
    .split('\n')
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter((line) => line.length > 2);
}

function buildMultiplierLabel(servings, adultCount, babyMode) {
  const base = adultCount / (servings || 2);
  return babyMode ? base * 1.25 : base; // baby adds ~25%
}

export function generateShoppingList(mealPlan, selectedDates, adultCount = 2) {
  const categorized = {};

  selectedDates.forEach((date) => {
    const day = mealPlan[date];
    if (!day) return;

    ['breakfast', 'lunch', 'dinner'].forEach((slot) => {
      const entry = day[slot];
      if (!entry?.recipe) return;

      const { recipe, babyMode } = entry;
      const multiplier = buildMultiplierLabel(recipe.servings, adultCount, babyMode);
      const lines = parseIngredientLines(recipe.ingredients);

      lines.forEach((line) => {
        const category = categorizeIngredient(line);
        if (!categorized[category]) categorized[category] = [];

        // Check if this ingredient already exists (simple dedup by first word)
        const key = line.toLowerCase().split(' ').slice(-3).join(' ');
        const existing = categorized[category].find((i) => i.key === key);

        if (existing) {
          existing.count += multiplier;
          existing.sources.push({ date, slot, recipe: recipe.name });
        } else {
          categorized[category].push({
            key,
            text: line,
            count: multiplier,
            sources: [{ date, slot, recipe: recipe.name }],
            checked: false,
          });
        }
      });
    });
  });

  // Sort categories and items
  const sorted = {};
  const categoryOrder = [
    'Légumes & Fruits',
    'Viandes & Poissons',
    'Produits laitiers & Œufs',
    'Féculents & Céréales',
    'Épicerie & Condiments',
    'Boissons',
    'Divers',
  ];

  categoryOrder.forEach((cat) => {
    if (categorized[cat]?.length) {
      sorted[cat] = categorized[cat].sort((a, b) => a.text.localeCompare(b.text));
    }
  });
  Object.keys(categorized).forEach((cat) => {
    if (!sorted[cat]) sorted[cat] = categorized[cat];
  });

  return sorted;
}

export function formatIngredientLine(item) {
  if (item.count === 1) return item.text;
  const multiplied = Math.round(item.count * 10) / 10;
  return `${item.text} (×${multiplied})`;
}
