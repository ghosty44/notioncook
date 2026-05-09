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

  const startTimer = (id, s) => setTimers((p) => ({ ...p, [id]: { running: true, remaining: s, total: s } }));
  const pauseTimer = (id) => setTimers((p) => ({ ...p, [id]: { ...p[id], running: !p[id].running } }));
  const resetTimer = (id, s) => setTimers((p) => ({ ...p, [id]: { running: false, remaining: s, total: s } }));
  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (entries.length === 0) return (
    <div className="text-center py-20 text-[#8e8e93]">
      <div className="text-5xl mb-4">⏱</div>
      <p className="font-medium mb-1">Aucune recette dans la session</p>
      <p className="text-sm">Ajoutez des recettes pour voir la timeline</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {timeline.map((step, index) => {
        const timer = timers[step.id];
        const cookSec = (step.cookTime || 0) * 60;
        const isDone = timer?.remaining === 0;

        return (
          <div key={step.id} className="bg-white rounded-2xl shadow-sm border border-black/5 p-4">
            <div className="flex items-start gap-3">
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                isDone ? 'bg-green-500 text-white' : 'bg-orange-100 text-orange-600'
              }`}>
                {isDone ? '✓' : index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[#1c1c1e] text-[15px] leading-tight truncate">{step.name}</h3>
                    <div className="flex flex-wrap gap-2 text-xs text-[#8e8e93] mt-1">
                      {step.prepTime > 0 && <span>🔪 {step.prepTime} min</span>}
                      {step.cookTime > 0 && <span>🔥 {step.cookTime} min</span>}
                      {step.parallel && (
                        <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">⚡ Parallèle</span>
                      )}
                    </div>
                  </div>

                  {cookSec > 0 && (
                    <div className="shrink-0 text-right">
                      {timer ? (
                        <div>
                          <div className={`text-xl font-mono font-bold tabular-nums ${
                            isDone ? 'text-green-500' : timer.remaining < 60 ? 'text-red-500' : 'text-[#1c1c1e]'
                          }`}>
                            {isDone ? '✓ Prêt !' : formatTime(timer.remaining)}
                          </div>
                          {!isDone && (
                            <div className="flex gap-1 justify-end mt-1.5">
                              <button
                                onClick={() => pauseTimer(step.id)}
                                className="w-7 h-7 bg-[#f2f2f7] rounded-full flex items-center justify-center text-xs text-[#1c1c1e]"
                              >{timer.running ? '⏸' : '▶'}</button>
                              <button
                                onClick={() => resetTimer(step.id, cookSec)}
                                className="w-7 h-7 bg-[#f2f2f7] rounded-full flex items-center justify-center text-xs text-[#1c1c1e]"
                              >↺</button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => startTimer(step.id, cookSec)}
                          className="bg-orange-500 text-white text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap"
                        >▶ {step.cookTime} min</button>
                      )}
                    </div>
                  )}
                </div>

                {timer && timer.total > 0 && !isDone && (
                  <div className="mt-3 bg-[#f2f2f7] rounded-full h-1.5">
                    <div
                      className="bg-orange-400 h-1.5 rounded-full transition-all"
                      style={{ width: `${((timer.total - timer.remaining) / timer.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
