import React, { useState, useMemo } from 'react';
import { useBatchStore } from '../store/batchStore';
import { generateShoppingList, formatIngredientLine } from '../utils/shoppingListUtils';

const CATEGORY_ORDER = [
  'Légumes & Fruits', 'Viandes & Poissons', 'Produits laitiers & Œufs',
  'Féculents & Céréales', 'Épicerie & Condiments', 'Boissons', 'Divers',
];

export default function ShoppingList() {
  const { entries, peopleCount, mealPlan } = useBatchStore();
  const [checked, setChecked] = useState({});

  const { categorized, fromPlan } = useMemo(() => {
    if (mealPlan?.shoppingList?.length > 0) {
      const groups = {};
      mealPlan.shoppingList.forEach((item) => {
        const cat = item.category || 'Divers';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push({
          key: item.name.toLowerCase().replace(/\s+/g, '-'),
          text: item.name,
          qty: item.quantity || '',
        });
      });
      return { categorized: groups, fromPlan: true };
    }
    const raw = generateShoppingList(entries, peopleCount);
    const groups = {};
    Object.entries(raw).forEach(([cat, items]) => {
      groups[cat] = items.map((i) => ({
        key: i.key,
        text: formatIngredientLine(i),
        qty: '',
        sources: i.sources,
      }));
    });
    return { categorized: groups, fromPlan: false };
  }, [mealPlan, entries, peopleCount]);

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => categorized[c]),
    ...Object.keys(categorized).filter((c) => !CATEGORY_ORDER.includes(c) && categorized[c]),
  ];

  const total = Object.values(categorized).reduce((acc, items) => acc + items.length, 0);
  const checkedCount = Object.values(checked).filter(Boolean).length;

  const toggleItem = (key) => setChecked((p) => ({ ...p, [key]: !p[key] }));

  function handleCopy() {
    const lines = orderedCategories.flatMap((cat) => [
      `\n${cat} :`,
      ...categorized[cat].map((item) => `  ${checked[item.key] ? '✓' : '○'} ${item.text}${item.qty ? ' — ' + item.qty : ''}`),
    ]);
    navigator.clipboard.writeText(lines.join('\n').trim());
  }

  if (total === 0) return (
    <div className="text-center py-20 text-[#8e8e93]">
      <div className="text-5xl mb-4">🛒</div>
      <p className="font-medium mb-1">Liste de courses vide</p>
      <p className="text-sm">
        {fromPlan ? 'Aucun ingrédient dans le plan' : 'Générez un plan ou ajoutez des recettes'}
      </p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#8e8e93]">
          {fromPlan ? '✨ Plan de repas' : `${peopleCount} pers.`} · {checkedCount}/{total} articles
        </p>
        <button onClick={handleCopy} className="text-xs text-orange-500 font-semibold">Copier</button>
      </div>

      <div className="bg-[#e5e5ea] rounded-full h-1.5 mb-5">
        <div
          className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${total > 0 ? (checkedCount / total) * 100 : 0}%` }}
        />
      </div>

      <div className="space-y-5">
        {orderedCategories.map((category) => (
          <div key={category}>
            <p className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2 px-1">{category}</p>
            <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
              {categorized[category].map((item, i, arr) => (
                <label
                  key={item.key}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${
                    i < arr.length - 1 ? 'border-b border-[#f2f2f7]' : ''
                  } ${checked[item.key] ? 'opacity-40' : ''}`}
                >
                  <div
                    onClick={() => toggleItem(item.key)}
                    className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                      checked[item.key] ? 'bg-orange-500 border-orange-500' : 'border-[#c7c7cc]'
                    }`}
                  >
                    {checked[item.key] && <span className="text-white text-[10px] font-bold">✓</span>}
                  </div>
                  <span className={`text-sm text-[#1c1c1e] flex-1 ${checked[item.key] ? 'line-through' : ''}`}>
                    {item.text}
                  </span>
                  {item.qty && (
                    <span className="text-xs text-[#8e8e93] shrink-0 font-medium">{item.qty}</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
