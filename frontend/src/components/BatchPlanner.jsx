import React from 'react';
import { useBatchStore } from '../store/batchStore';

export default function BatchPlanner({ loading }) {
  const { entries, removeEntry, updateServings, clearSession } = useBatchStore();

  const totalTime = entries.reduce((acc, e) => {
    return acc + (e.recipe.prepTime || 0) + (e.recipe.cookTime || 0);
  }, 0);
  const hours = Math.floor(totalTime / 60);
  const minutes = totalTime % 60;

  if (loading) return <div className="text-center py-16 text-gray-500">Chargement…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">🥘 Session de batch cooking</h2>
          {entries.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              Temps total estimé : {hours > 0 ? `${hours}h ` : ''}{minutes > 0 ? `${minutes}min` : ''}
            </p>
          )}
        </div>
        {entries.length > 0 && (
          <button
            onClick={clearSession}
            className="text-sm text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg"
          >
            Vider la session
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🥗</div>
          <p className="text-lg font-medium mb-2">Aucune recette dans la session</p>
          <p className="text-sm">Ajoutez des recettes depuis la bibliothèque</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const totalT = (entry.recipe.prepTime || 0) + (entry.recipe.cookTime || 0);
            return (
              <div
                key={entry.recipe.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4"
              >
                {entry.recipe.imageUrl && (
                  <img src={entry.recipe.imageUrl} alt={entry.recipe.name} className="w-16 h-16 object-cover rounded-lg shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{entry.recipe.name}</h3>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                    {entry.recipe.category && <span>{entry.recipe.category}</span>}
                    {totalT > 0 && <span>⏱ {totalT} min</span>}
                    {entry.recipe.batchFriendly && <span className="text-green-600">✓ Batch</span>}
                    {entry.recipe.storageDays && <span>🗓 {entry.recipe.storageDays}j {entry.recipe.storageMethod || ''}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs text-gray-500">Portions :</label>
                  <select
                    value={entry.servings}
                    onChange={(e) => updateServings(entry.recipe.id, Number(e.target.value))}
                    className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {[2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => removeEntry(entry.recipe.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors text-xl shrink-0"
                  title="Retirer"
                >
                  ×
                </button>
              </div>
            );
          })}

          <div className="mt-6 bg-amber-50 rounded-xl border border-amber-200 p-4">
            <h3 className="font-semibold text-amber-800 mb-3">Récapitulatif</h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-700">{entries.length}</div>
                <div className="text-xs text-gray-500">recettes</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-700">
                  {hours > 0 ? `${hours}h${minutes > 0 ? minutes : ''}` : `${minutes}min`}
                </div>
                <div className="text-xs text-gray-500">temps total</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-700">
                  {entries.reduce((acc, e) => acc + e.servings, 0)}
                </div>
                <div className="text-xs text-gray-500">portions au total</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
