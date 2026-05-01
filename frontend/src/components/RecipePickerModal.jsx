import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { SLOT_LABELS } from '../utils/dateUtils';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import RecipeCard from './RecipeCard';

export default function RecipePickerModal({ recipes, onSelect, onClose, date, slot }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return recipes;
    const q = search.toLowerCase();
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.ingredients?.toLowerCase().includes(q) ||
        r.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [recipes, search]);

  const dateLabel = date
    ? format(parseISO(date), 'EEEE d MMMM', { locale: fr })
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">Choisir une recette</h2>
            <p className="text-xs text-gray-500 mt-0.5 capitalize">
              {dateLabel} — {SLOT_LABELS[slot]}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              type="text"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
        </div>

        {/* Recipe list */}
        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-2">
          {filtered.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">Aucune recette trouvée</p>
          )}
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              compact
              onClick={() => onSelect(recipe)}
              className="hover:border-brand-300"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
