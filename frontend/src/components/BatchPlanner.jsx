import React from 'react';
import { useBatchStore } from '../store/batchStore';

export default function BatchPlanner({ loading }) {
  const { entries, removeEntry, clearSession, peopleCount, setPeopleCount } = useBatchStore();

  const totalTime = entries.reduce((acc, e) => acc + (e.recipe.prepTime || 0) + (e.recipe.cookTime || 0), 0);
  const hours = Math.floor(totalTime / 60);
  const minutes = totalTime % 60;
  const timeLabel = totalTime === 0 ? '—' : hours > 0 ? `${hours}h${minutes > 0 ? minutes : ''}` : `${minutes}min`;

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-10 h-10 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* People count card */}
      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold text-[#1c1c1e]">Nombre de personnes</div>
            <div className="text-xs text-[#8e8e93] mt-0.5">Ajuste les portions et la liste de courses</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPeopleCount(peopleCount - 1)}
              className="w-9 h-9 bg-[#f2f2f7] rounded-full flex items-center justify-center text-orange-500 font-bold text-xl leading-none select-none"
            >−</button>
            <span className="text-[26px] font-bold text-[#1c1c1e] w-8 text-center tabular-nums">{peopleCount}</span>
            <button
              onClick={() => setPeopleCount(peopleCount + 1)}
              className="w-9 h-9 bg-[#f2f2f7] rounded-full flex items-center justify-center text-orange-500 font-bold text-xl leading-none select-none"
            >+</button>
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-20 text-[#8e8e93]">
          <div className="text-5xl mb-4">🥗</div>
          <p className="font-medium mb-1">Aucune recette dans la session</p>
          <p className="text-sm">Ajoutez des recettes depuis l'onglet Recettes</p>
        </div>
      ) : (
        <>
          <div className="space-y-2.5 mb-4">
            {entries.map((entry) => {
              const t = (entry.recipe.prepTime || 0) + (entry.recipe.cookTime || 0);
              return (
                <div key={entry.recipe.id} className="bg-white rounded-2xl shadow-sm border border-black/5 flex overflow-hidden">
                  {entry.recipe.imageUrl && (
                    <img src={entry.recipe.imageUrl} alt={entry.recipe.name} className="w-20 h-20 object-cover shrink-0" />
                  )}
                  <div className="flex-1 p-3 min-w-0">
                    <h3 className="font-semibold text-[#1c1c1e] text-sm leading-tight mb-1 truncate">{entry.recipe.name}</h3>
                    <div className="flex flex-wrap gap-2 text-xs text-[#8e8e93]">
                      {t > 0 && <span>⏱ {t} min</span>}
                      {entry.recipe.batchFriendly && <span className="text-green-600">✓ Batch</span>}
                      {entry.recipe.storageDays && <span>🗓 {entry.recipe.storageDays}j</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => removeEntry(entry.recipe.id)}
                    className="px-4 text-[#c7c7cc] hover:text-red-400 transition-colors text-2xl font-light"
                  >×</button>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4">
            <p className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-3">Récapitulatif</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { value: entries.length, label: 'recettes' },
                { value: timeLabel, label: 'estimé' },
                { value: peopleCount, label: 'personnes' },
              ].map((s) => (
                <div key={s.label} className="bg-[#f2f2f7] rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-[#1c1c1e]">{s.value}</div>
                  <div className="text-xs text-[#8e8e93]">{s.label}</div>
                </div>
              ))}
            </div>
            <button
              onClick={clearSession}
              className="w-full py-2.5 text-red-500 text-sm font-medium rounded-xl border border-red-100 hover:bg-red-50 transition-colors"
            >
              Vider la session
            </button>
          </div>
        </>
      )}
    </div>
  );
}
