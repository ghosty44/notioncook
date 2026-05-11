import React from 'react';
import { Clock, Users, Baby, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { useBatchStore } from '../store/batchStore';

const CATEGORY_COLORS = {
  'Petit-déjeuner': 'badge-orange',
  'Déjeuner': 'badge-blue',
  'Dîner': 'badge-purple',
  'Snack': 'badge-green',
  'Dessert': 'bg-pink-100 text-pink-700 badge',
  'Soupe': 'bg-amber-100 text-amber-700 badge',
  'Salade': 'bg-lime-100 text-lime-700 badge',
  'Autre': 'bg-gray-100 text-gray-600 badge',
};

export default function RecipeCard({ recipe, onClick, compact = false, draggable = false, className = '', onToggleFavorite }) {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  const { favorites, toggleFavorite } = useBatchStore();
  const recipeKey = recipe.id || recipe.name;
  const isFav = recipe.notionUrl ? (recipe.favori ?? false) : favorites.includes(recipeKey);

  function handleFavClick(e) {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(recipe);
    } else {
      toggleFavorite(recipe);
    }
  }

  return (
    <div
      onClick={onClick}
      className={clsx(
        'card transition-all duration-150 overflow-hidden',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        draggable && 'cursor-grab active:cursor-grabbing',
        compact ? 'p-3' : 'p-4',
        className
      )}
    >
      {!compact && recipe.imageUrl && (
        <div className="h-32 -mx-4 -mt-4 mb-3 overflow-hidden">
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <h3 className={clsx('font-semibold text-gray-800 leading-tight', compact ? 'text-sm' : 'text-base')}>
          {recipe.name}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {recipe.notionUrl && !compact && (
            <a
              href={recipe.notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-400 hover:text-brand-500"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={handleFavClick}
            className="text-sm leading-none"
            aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            {isFav ? '❤️' : '🤍'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
        {totalTime > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {totalTime} min
          </span>
        )}
        {recipe.servings && (
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {recipe.servings} pers.
          </span>
        )}
        {recipe.babyAdaptation && (
          <span className="flex items-center gap-1 text-green-600">
            <Baby className="w-3 h-3" />
            Bébé
          </span>
        )}
        {recipe.dejaFait && (
          <span className="text-green-500 font-medium">✓ Réalisée</span>
        )}
      </div>

      {!compact && recipe.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {recipe.category && (
            <span className={CATEGORY_COLORS[recipe.category] || 'badge bg-gray-100 text-gray-600'}>
              {recipe.category}
            </span>
          )}
          {recipe.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="badge bg-gray-100 text-gray-600">{tag}</span>
          ))}
        </div>
      )}

      {recipe.source === 'gemini' && (
        <div className="mt-2 flex items-center gap-1 text-xs text-purple-500">
          <span>✨ Suggestion IA</span>
        </div>
      )}
    </div>
  );
}
