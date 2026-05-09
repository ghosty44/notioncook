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
    'bouillon', 'concentré de tomate', 'tomate pelée',
  ],
  'Boissons': ['eau', 'jus', 'café', 'thé', 'vin', 'bière'],
};

function categorizeIngredient(line) {
  const lower = line.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return 'Divers';
}

function parseIngredientLines(text) {
  if (!text) return [];
  return text
    .split('\n')
    .map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter((line) => line.length > 2);
}

export function generateShoppingList(entries) {
  const categorized = {};

  entries.forEach(({ recipe, servings }) => {
    const multiplier = servings / (recipe.servings || 4);
    const lines = parseIngredientLines(recipe.ingredients);

    lines.forEach((line) => {
      const category = categorizeIngredient(line);
      if (!categorized[category]) categorized[category] = [];

      const key = line.toLowerCase().split(' ').slice(-3).join(' ');
      const existing = categorized[category].find((i) => i.key === key);

      if (existing) {
        existing.count += multiplier;
        if (!existing.sources.includes(recipe.name)) existing.sources.push(recipe.name);
      } else {
        categorized[category].push({
          key,
          text: line,
          count: multiplier,
          sources: [recipe.name],
          checked: false,
        });
      }
    });
  });

  const categoryOrder = [
    'Légumes & Fruits', 'Viandes & Poissons', 'Produits laitiers & Œufs',
    'Féculents & Céréales', 'Épicerie & Condiments', 'Boissons', 'Divers',
  ];

  const sorted = {};
  categoryOrder.forEach((cat) => {
    if (categorized[cat]?.length) sorted[cat] = categorized[cat].sort((a, b) => a.text.localeCompare(b.text));
  });
  Object.keys(categorized).forEach((cat) => { if (!sorted[cat]) sorted[cat] = categorized[cat]; });

  return sorted;
}

export function formatIngredientLine(item) {
  const mult = Math.round(item.count * 10) / 10;
  return item.count === 1 ? item.text : `${item.text} (×${mult})`;
}
