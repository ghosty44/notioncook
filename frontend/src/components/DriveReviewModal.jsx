import React, { useState, useMemo } from 'react';

const CATEGORY_ORDER = [
  'Légumes & Fruits', 'Viandes & Poissons', 'Produits laitiers & Œufs',
  'Féculents & Céréales', 'Épicerie & Condiments', 'Boissons', 'Divers',
];

export default function DriveReviewModal({ items, sourceName, onConfirm, onClose }) {
  const [checked, setChecked] = useState(() => {
    const init = {};
    items.forEach((_, i) => { init[i] = true; });
    return init;
  });

  const grouped = useMemo(() => {
    const g = {};
    items.forEach((item, i) => {
      const cat = item.category || 'Divers';
      if (!g[cat]) g[cat] = [];
      g[cat].push({ ...item, idx: i });
    });
    const sorted = {};
    CATEGORY_ORDER.forEach((cat) => { if (g[cat]) sorted[cat] = g[cat]; });
    Object.keys(g).forEach((cat) => { if (!sorted[cat]) sorted[cat] = g[cat]; });
    return sorted;
  }, [items]);

  const checkedCount = Object.values(checked).filter(Boolean).length;
  const checkedItems = items.filter((_, i) => checked[i]);

  function toggleItem(idx) {
    setChecked((p) => ({ ...p, [idx]: !p[idx] }));
  }

  function toggleAll() {
    const allChecked = checkedCount === items.length;
    const next = {};
    items.forEach((_, i) => { next[i] = !allChecked; });
    setChecked(next);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-xl rounded-t-[32px] sm:rounded-[32px] overflow-hidden max-h-[88vh] flex flex-col shadow-2xl">
        <div className="flex justify-center pt-3 pb-0 sm:hidden">
          <div className="w-9 h-1 bg-[#e5e5ea] rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-[#f2f2f7]">
          <div className="flex items-center justify-between mb-0.5">
            <h2 className="text-[17px] font-bold text-[#1c1c1e]">Vérifier les articles</h2>
            <button onClick={onClose} className="w-7 h-7 bg-[#f2f2f7] rounded-full flex items-center justify-center text-[#8e8e93] text-sm">×</button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#8e8e93]">{sourceName} · {checkedCount}/{items.length} sélectionné{checkedCount > 1 ? 's' : ''}</p>
            <button onClick={toggleAll} className="text-xs text-orange-500 font-semibold">
              {checkedCount === items.length ? 'Tout décocher' : 'Tout cocher'}
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="overflow-y-auto flex-1 px-4 py-3">
          {Object.entries(grouped).map(([category, catItems]) => (
            <div key={category} className="mb-3">
              <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider px-1 mb-1.5">{category}</p>
              <div className="bg-[#f9f9f9] rounded-xl overflow-hidden">
                {catItems.map((item, ci) => (
                  <button
                    key={item.idx}
                    onClick={() => toggleItem(item.idx)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-opacity ${
                      ci < catItems.length - 1 ? 'border-b border-white' : ''
                    } ${!checked[item.idx] ? 'opacity-40' : ''}`}
                  >
                    <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      checked[item.idx] ? 'bg-orange-500 border-orange-500' : 'border-[#c7c7cc]'
                    }`}>
                      {checked[item.idx] && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={`flex-1 text-sm text-[#1c1c1e] text-left ${!checked[item.idx] ? 'line-through' : ''}`}>{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 pb-5 pt-3 border-t border-[#f2f2f7] space-y-2">
          <button
            onClick={() => onConfirm(checkedItems)}
            disabled={checkedCount === 0}
            className="w-full bg-orange-500 text-white py-3.5 rounded-2xl font-semibold text-[15px] disabled:opacity-40 transition-opacity active:scale-[0.98]"
          >
            🛒 Ajouter {checkedCount} article{checkedCount > 1 ? 's' : ''} au panier
          </button>
          <button onClick={onClose} className="w-full bg-[#f2f2f7] text-[#3a3a3c] py-3 rounded-2xl font-semibold text-sm">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
