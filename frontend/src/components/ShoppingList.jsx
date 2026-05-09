import React, { useState, useMemo } from 'react';
import { useBatchStore } from '../store/batchStore';
import { generateShoppingList, formatIngredientLine } from '../utils/shoppingListUtils';

const CATEGORY_ORDER = [
  'Légumes & Fruits', 'Viandes & Poissons', 'Produits laitiers & Œufs',
  'Féculents & Céréales', 'Épicerie & Condiments', 'Boissons', 'Divers',
];

export default function ShoppingList() {
  const { entries, peopleCount } = useBatchStore();
  const [checked, setChecked] = useState({});

  const shoppingList = useMemo(
    () => generateShoppingList(entries, peopleCount),
    [entries, peopleCount]
  );

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => shoppingList[c]),
    ...Object.keys(shoppingList).filter((c) => !CATEGORY_ORDER.includes(c) && shoppingList[c]),
  ];

  const total = Object.values(shoppingList).reduce((acc, items) => acc + items.length, 0);
  const checkedCount = Object.values(checked).filter(Boolean).length;

  const toggleItem = (key) => setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleCopy = () => {
    const text = orderedCategories.flatMap((cat) => [
      `\n${cat}`,
      ...shoppingList[cat].map((item) => `  ${checked[item.key] ? '✓' : '○'} ${formatIngredientLine(item)}`),
    ]).join('\n').trim();
    navigator.clipboard.writeText(text);
  };

  if (entries.length === 0) return (
    <div className="text-center py-20 text-[#8e8e93]">
      <div className="text-5xl mb-4">🛒</div>
      <p className="font-medium mb-1">Liste de courses vide</p>
      <p className="text-sm">Ajoutez des recettes dans la session</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#8e8e93]">
          {checkedCount}/{total} articles · {peopleCount} personne{peopleCount > 1 ? 's' : ''}
        </p>
        <div className="flex gap-3">
          <button onClick={handleCopy} className="text-xs text-orange-500 font-semibold">Copier</button>
          <button onClick={() => window.print()} className="text-xs text-orange-500 font-semibold">Imprimer</button>
        </div>
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
              {shoppingList[category].map((item, i, arr) => (
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
                  <span className={`text-sm text-[#1c1c1e] flex-1 ${
                    checked[item.key] ? 'line-through' : ''
                  }`}>
                    {formatIngredientLine(item)}
                  </span>
                  <span className="text-xs text-[#c7c7cc] shrink-0 max-w-[90px] truncate text-right">
                    {item.sources.join(', ')}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
