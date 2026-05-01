import React, { useState, useMemo, useCallback } from 'react';
import { ShoppingCart, Check, ChevronDown, ChevronUp, Printer, Copy, CheckCheck, Calendar } from 'lucide-react';
import { eachDayOfInterval, addDays, subDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMealPlanStore } from '../store/mealPlanStore';
import { generateShoppingList, formatIngredientLine } from '../utils/shoppingListUtils';
import { toDateKey } from '../utils/dateUtils';
import clsx from 'clsx';

const CATEGORY_ICONS = {
  'Légumes & Fruits': '🥦',
  'Viandes & Poissons': '🥩',
  'Produits laitiers & Œufs': '🧀',
  'Féculents & Céréales': '🌾',
  'Épicerie & Condiments': '🫙',
  'Boissons': '🥤',
  'Divers': '📦',
};

function DateRangePicker({ startDate, endDate, onChange }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Calendar className="w-4 h-4 text-gray-400" />
      <input
        type="date"
        value={startDate}
        onChange={(e) => onChange(e.target.value, endDate)}
        className="input w-auto"
      />
      <span className="text-gray-400">→</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onChange(startDate, e.target.value)}
        className="input w-auto"
      />
    </div>
  );
}

export default function ShoppingList() {
  const { mealPlan } = useMealPlanStore();
  const today = toDateKey(new Date());
  const nextWeek = toDateKey(addDays(new Date(), 6));

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextWeek);
  const [adultCount, setAdultCount] = useState(2);
  const [checkedItems, setCheckedItems] = useState({});
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [copied, setCopied] = useState(false);

  const selectedDates = useMemo(() => {
    if (!startDate || !endDate || startDate > endDate) return [];
    return eachDayOfInterval({
      start: new Date(startDate + 'T00:00:00'),
      end: new Date(endDate + 'T00:00:00'),
    }).map(toDateKey);
  }, [startDate, endDate]);

  const shoppingList = useMemo(() => {
    return generateShoppingList(mealPlan, selectedDates, adultCount);
  }, [mealPlan, selectedDates, adultCount]);

  const totalItems = useMemo(
    () => Object.values(shoppingList).reduce((sum, items) => sum + items.length, 0),
    [shoppingList]
  );

  const checkedCount = useMemo(
    () => Object.keys(checkedItems).filter((k) => checkedItems[k]).length,
    [checkedItems]
  );

  const toggleItem = useCallback((key) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleCategory = useCallback((cat) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const checkAll = useCallback(() => {
    const all = {};
    Object.values(shoppingList).flat().forEach((item) => { all[item.key] = true; });
    setCheckedItems(all);
  }, [shoppingList]);

  const uncheckAll = useCallback(() => setCheckedItems({}), []);

  // Export as plain text
  const exportText = useCallback(() => {
    const lines = [`Liste de courses — ${startDate} → ${endDate}`, ''];
    Object.entries(shoppingList).forEach(([cat, items]) => {
      lines.push(`## ${cat}`);
      items.forEach((item) => {
        const mark = checkedItems[item.key] ? '✓' : '□';
        lines.push(`${mark} ${formatIngredientLine(item)}`);
      });
      lines.push('');
    });
    return lines.join('\n');
  }, [shoppingList, checkedItems, startDate, endDate]);

  const copyToClipboard = useCallback(async () => {
    await navigator.clipboard.writeText(exportText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [exportText]);

  const printList = useCallback(() => {
    const win = window.open('', '_blank');
    win.document.write(`<pre style="font-family:sans-serif;white-space:pre-wrap">${exportText()}</pre>`);
    win.print();
    win.close();
  }, [exportText]);

  // Count meals in the selection
  const mealCount = useMemo(() => {
    let count = 0;
    selectedDates.forEach((d) => {
      if (mealPlan[d]) count += Object.keys(mealPlan[d]).length;
    });
    return count;
  }, [selectedDates, mealPlan]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Liste de courses</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Générée automatiquement depuis votre planning
          </p>
        </div>
        {totalItems > 0 && (
          <div className="flex gap-2">
            <button onClick={copyToClipboard} className="btn-secondary text-xs">
              {copied ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copié !' : 'Copier'}
            </button>
            <button onClick={printList} className="btn-secondary text-xs">
              <Printer className="w-4 h-4" />
              Imprimer
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
          />
          <div className="flex items-center gap-2 text-sm ml-auto">
            <span className="text-gray-600">Adultes :</span>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setAdultCount(n)}
                className={clsx(
                  'w-8 h-8 rounded-lg font-medium text-sm transition-all',
                  adultCount === n ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span>{selectedDates.length} jour{selectedDates.length > 1 ? 's' : ''} sélectionné{selectedDates.length > 1 ? 's' : ''}</span>
          <span>{mealCount} repas planifié{mealCount > 1 ? 's' : ''}</span>
          <span>{totalItems} ingrédient{totalItems > 1 ? 's' : ''}</span>
          {totalItems > 0 && (
            <span className="text-brand-600 font-medium">
              {checkedCount}/{totalItems} coché{checkedCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Empty state */}
      {totalItems === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
          {mealCount === 0 ? (
            <>
              <p className="font-medium">Aucun repas planifié sur cette période</p>
              <p className="text-sm mt-1">Ajoutez des recettes dans le Planning pour générer votre liste</p>
            </>
          ) : (
            <>
              <p className="font-medium">Les recettes planifiées n'ont pas d'ingrédients renseignés</p>
              <p className="text-sm mt-1">Ajoutez des ingrédients à vos recettes dans Notion</p>
            </>
          )}
        </div>
      )}

      {/* List */}
      {totalItems > 0 && (
        <>
          {/* Bulk actions */}
          <div className="flex gap-2 mb-4">
            <button onClick={checkAll} className="btn-ghost text-xs">
              <CheckCheck className="w-3.5 h-3.5" />
              Tout cocher
            </button>
            <button onClick={uncheckAll} className="btn-ghost text-xs">
              Tout décocher
            </button>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            {Object.entries(shoppingList).map(([category, items]) => {
              const isCollapsed = collapsedCategories[category];
              const catChecked = items.filter((i) => checkedItems[i.key]).length;

              return (
                <div key={category} className="card overflow-hidden">
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{CATEGORY_ICONS[category] || '📦'}</span>
                      <span className="font-semibold text-gray-800">{category}</span>
                      <span className="text-xs text-gray-400">
                        {catChecked}/{items.length}
                      </span>
                    </div>
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {/* Items */}
                  {!isCollapsed && (
                    <ul className="divide-y divide-gray-50">
                      {items.map((item) => {
                        const isChecked = !!checkedItems[item.key];
                        return (
                          <li
                            key={item.key}
                            onClick={() => toggleItem(item.key)}
                            className={clsx(
                              'flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors',
                              isChecked && 'opacity-50'
                            )}
                          >
                            <div
                              className={clsx(
                                'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                                isChecked
                                  ? 'bg-brand-500 border-brand-500'
                                  : 'border-gray-300'
                              )}
                            >
                              {isChecked && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span
                              className={clsx(
                                'text-sm text-gray-700 flex-1',
                                isChecked && 'line-through text-gray-400'
                              )}
                            >
                              {formatIngredientLine(item)}
                            </span>
                            {item.count > 1 && (
                              <span className="text-xs text-gray-400 shrink-0">
                                ×{Math.round(item.count * 10) / 10}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
