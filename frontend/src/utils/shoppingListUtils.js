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
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some((kw) => lower.includes(kw))) return cat;
  }
  return 'Divers';
}

function parseIngredientLines(text) {
  if (!text) return [];
  return text
    .split('\n')
    .map((l) => l.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter((l) => l.length > 2);
}

export function generateShoppingList(entries, peopleCount = 4) {
  const categorized = {};

  entries.forEach(({ recipe }) => {
    const multiplier = peopleCount / (recipe.servings || 1);
    const lines = parseIngredientLines(recipe.ingredients);

    lines.forEach((line) => {
      const cat = categorizeIngredient(line);
      if (!categorized[cat]) categorized[cat] = [];

      const key = line.toLowerCase().split(' ').slice(-3).join(' ');
      const existing = categorized[cat].find((i) => i.key === key);

      if (existing) {
        existing.count += multiplier;
        if (!existing.sources.includes(recipe.name)) existing.sources.push(recipe.name);
      } else {
        categorized[cat].push({ key, text: line, count: multiplier, sources: [recipe.name] });
      }
    });
  });

  const ORDER = [
    'Légumes & Fruits', 'Viandes & Poissons', 'Produits laitiers & Œufs',
    'Féculents & Céréales', 'Épicerie & Condiments', 'Boissons', 'Divers',
  ];
  const sorted = {};
  ORDER.forEach((cat) => {
    if (categorized[cat]?.length) sorted[cat] = categorized[cat].sort((a, b) => a.text.localeCompare(b.text));
  });
  Object.keys(categorized).forEach((cat) => { if (!sorted[cat]) sorted[cat] = categorized[cat]; });
  return sorted;
}

export function formatIngredientLine(item) {
  const mult = Math.round(item.count * 10) / 10;
  return mult === 1 ? item.text : `${item.text} (×${mult})`;
}
