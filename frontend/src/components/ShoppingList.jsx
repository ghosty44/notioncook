import React, { useState, useMemo } from 'react';
import { useBatchStore } from '../store/batchStore';
import { generateShoppingList, formatIngredientLine } from '../utils/shoppingListUtils';

export default function ShoppingList() {
  const { entries } = useBatchStore();
  const [checked, setChecked] = useState({});

  const shoppingList = useMemo(() => generateShoppingList(entries), [entries]);

  const categoryOrder = [
    'Légumes & Fruits', 'Viandes & Poissons', 'Produits laitiers & Œufs',
    'Féculents & Céréales', 'Épicerie & Condiments', 'Boissons', 'Divers',
  ];
  const orderedCategories = [
    ...categoryOrder.filter((c) => shoppingList[c]),
    ...Object.keys(shoppingList).filter((c) => !categoryOrder.includes(c)),
  ];

  const total = Object.values(shoppingList).reduce((acc, items) => acc + items.length, 0);
  const checkedCount = Object.values(checked).filter(Boolean).length;

  function toggleItem(key) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleCopy() {
    const lines = orderedCategories.flatMap((cat) => [
      `\n== ${cat} ==`,
      ...shoppingList[cat].map((item) => `  ${checked[item.key] ? '✓' : '○'} ${formatIngredientLine(item)}`),
    ]);
    navigator.clipboard.writeText(lines.join('\n').trim());
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-5xl mb-4">🛒</div>
        <p className="text-lg font-medium mb-2">Liste de courses vide</p>
        <p className="text-sm">Ajoutez des recettes dans le Batch Planner pour générer la liste</p>
      </div>
    );
  }

  if (total === 0) {
    return <div className="text-center py-16 text-gray-400">Aucun ingrédient trouvé dans les recettes sélectionnées.</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">🛒 Liste de courses</h2>
          <p className="text-sm text-gray-500 mt-1">
            {checkedCount}/{total} articles cochés · {entries.length} recette{entries.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCopy} className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">
            📋 Copier
          </button>
          <button onClick={() => window.print()} className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">
            🖨 Imprimer
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${total > 0 ? (checkedCount / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {orderedCategories.map((category) => (
          <div key={category}>
            <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
              {category}
              <span className="text-xs font-normal text-gray-400">({shoppingList[category].length})</span>
            </h3>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {shoppingList[category].map((item) => (
                <label
                  key={item.key}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b last:border-b-0 border-gray-50 hover:bg-gray-50 transition-colors ${
                    checked[item.key] ? 'opacity-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!checked[item.key]}
                    onChange={() => toggleItem(item.key)}
                    className="accent-amber-500 w-4 h-4 shrink-0"
                  />
                  <span className={`text-sm text-gray-700 flex-1 ${checked[item.key] ? 'line-through' : ''}`}>
                    {formatIngredientLine(item)}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0 text-right">
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
