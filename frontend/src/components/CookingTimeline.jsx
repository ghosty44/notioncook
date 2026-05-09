import React, { useState, useEffect, useRef } from 'react';
import { useBatchStore } from '../store/batchStore';
import { buildTimeline } from '../utils/timelineUtils';

export default function CookingTimeline() {
  const { entries } = useBatchStore();
  const [timers, setTimers] = useState({});
  const intervalRef = useRef(null);

  const timeline = buildTimeline(entries);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach((id) => {
          if (next[id].running && next[id].remaining > 0) {
            next[id] = { ...next[id], remaining: next[id].remaining - 1 };
            changed = true;
          } else if (next[id].running && next[id].remaining === 0) {
            next[id] = { ...next[id], running: false };
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  function startTimer(id, seconds) {
    setTimers((prev) => ({ ...prev, [id]: { running: true, remaining: seconds, total: seconds } }));
  }

  function pauseTimer(id) {
    setTimers((prev) => ({ ...prev, [id]: { ...prev[id], running: !prev[id].running } }));
  }

  function resetTimer(id, seconds) {
    setTimers((prev) => ({ ...prev, [id]: { running: false, remaining: seconds, total: seconds } }));
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-5xl mb-4">⏱</div>
        <p className="text-lg font-medium mb-2">Aucune recette dans la session</p>
        <p className="text-sm">Ajoutez des recettes dans le Batch Planner pour voir la timeline</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">⏱ Timeline de cuisson</h2>
        <p className="text-sm text-gray-500 mt-1">
          Ordre de préparation optimisé · {timeline.length} étape{timeline.length > 1 ? 's' : ''}
        </p>
      </div>

      <div className="relative">
        <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-amber-200" />
        <div className="space-y-4">
          {timeline.map((step, index) => {
            const timerId = step.id;
            const timer = timers[timerId];
            const cookSeconds = (step.cookTime || 0) * 60;
            const isDone = timer?.remaining === 0;

            return (
              <div key={step.id} className="relative flex gap-4">
                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 z-10 ${
                  isDone ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-amber-400 text-amber-700'
                }`}>
                  {isDone ? '✓' : index + 1}
                </div>

                <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-800">{step.name}</h3>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                        {step.prepTime > 0 && <span>🔪 Prep : {step.prepTime} min</span>}
                        {step.cookTime > 0 && <span>🔥 Cuisson : {step.cookTime} min</span>}
                        {step.category && <span className="bg-gray-100 px-2 py-0.5 rounded">{step.category}</span>}
                        {step.parallel && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">⚡ Parallèle</span>
                        )}
                      </div>
                    </div>

                    {cookSeconds > 0 && (
                      <div className="shrink-0 text-right">
                        {timer ? (
                          <div className="space-y-1">
                            <div className={`text-2xl font-mono font-bold ${
                              timer.remaining === 0 ? 'text-green-600' :
                              timer.remaining < 60 ? 'text-red-500' : 'text-amber-700'
                            }`}>
                              {timer.remaining === 0 ? '✓ Prêt !' : formatTime(timer.remaining)}
                            </div>
                            {timer.remaining > 0 && (
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => pauseTimer(timerId)}
                                  className="text-xs border border-gray-200 px-2 py-0.5 rounded hover:bg-gray-50"
                                >
                                  {timer.running ? '⏸' : '▶'}
                                </button>
                                <button
                                  onClick={() => resetTimer(timerId, cookSeconds)}
                                  className="text-xs border border-gray-200 px-2 py-0.5 rounded hover:bg-gray-50"
                                >
                                  ↺
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => startTimer(timerId, cookSeconds)}
                            className="bg-amber-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-amber-600 font-medium"
                          >
                            ▶ Démarrer ({step.cookTime} min)
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {timer && timer.total > 0 && timer.remaining > 0 && (
                    <div className="mt-3 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-amber-400 h-1.5 rounded-full transition-all"
                        style={{ width: `${((timer.total - timer.remaining) / timer.total) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
