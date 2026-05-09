import React, { useState, useEffect, useRef } from 'react';
import { useBatchStore } from '../store/batchStore';
import { buildTimeline } from '../utils/timelineUtils';

function formatMinutes(min) {
  if (!min) return '';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${m}` : `${h}h`;
}

function extractMinutes(task) {
  const m = task.match(/(\d+)\s*min/i);
  return m ? parseInt(m[1], 10) : null;
}

function useTimers() {
  const [timers, setTimers] = useState({});
  const ref = useRef(null);

  useEffect(() => {
    ref.current = setInterval(() => {
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
    return () => clearInterval(ref.current);
  }, []);

  const start = (id, min) =>
    setTimers((p) => ({ ...p, [id]: { running: true, remaining: min * 60, total: min * 60 } }));
  const pause = (id) =>
    setTimers((p) => ({ ...p, [id]: { ...p[id], running: !p[id].running } }));
  const reset = (id, min) =>
    setTimers((p) => ({ ...p, [id]: { running: false, remaining: min * 60, total: min * 60 } }));
  const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return { timers, start, pause, reset, fmt };
}

function BatchSessions({ sessions }) {
  const [checked, setChecked] = useState({});
  const { timers, start, pause, reset, fmt } = useTimers();

  function toggleCheck(key) {
    setChecked((p) => ({ ...p, [key]: !p[key] }));
  }

  return (
    <div className="space-y-4">
      {sessions.map((session, si) => (
        <div key={si} className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-[#f2f2f7] flex items-start justify-between">
            <div>
              <p className="text-[15px] font-bold text-[#1c1c1e]">{session.dayLabel}</p>
              {session.label && session.label !== session.dayLabel && (
                <p className="text-xs text-[#8e8e93] mt-0.5">{session.label}</p>
              )}
            </div>
            {session.totalMinutes > 0 && (
              <span className="text-xs bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full font-semibold shrink-0">
                ⏱ {formatMinutes(session.totalMinutes)}
              </span>
            )}
          </div>

          {session.tasks.map((task, ti) => {
            const key = `${si}-${ti}`;
            const taskMin = extractMinutes(task);
            const timer = timers[key];
            const done = checked[key];
            const timerDone = timer?.remaining === 0;

            return (
              <div
                key={ti}
                className={`flex items-start gap-3 px-4 py-3.5 border-b last:border-b-0 border-[#f2f2f7] ${
                  done ? 'opacity-40' : ''
                }`}
              >
                <button
                  onClick={() => toggleCheck(key)}
                  className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    done ? 'bg-green-500 border-green-500' : 'border-[#c7c7cc]'
                  }`}
                >
                  {done && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                <span className={`flex-1 text-sm text-[#1c1c1e] leading-relaxed ${done ? 'line-through' : ''}`}>
                  {task}
                </span>

                {taskMin && !done && (
                  <div className="shrink-0 text-right">
                    {timer ? (
                      <div>
                        <p className={`text-sm font-mono font-bold tabular-nums ${
                          timerDone ? 'text-green-500' : timer.remaining < 60 ? 'text-red-500' : 'text-[#1c1c1e]'
                        }`}>
                          {timerDone ? '✓ Prêt' : fmt(timer.remaining)}
                        </p>
                        {!timerDone && (
                          <div className="flex gap-1 justify-end mt-1">
                            <button
                              onClick={() => pause(key)}
                              className="w-6 h-6 bg-[#f2f2f7] rounded-full flex items-center justify-center text-[10px]"
                            >{timer.running ? '⏸' : '▶'}</button>
                            <button
                              onClick={() => reset(key, taskMin)}
                              className="w-6 h-6 bg-[#f2f2f7] rounded-full flex items-center justify-center text-[10px]"
                            >↺</button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => start(key, taskMin)}
                        className="text-[11px] bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-semibold whitespace-nowrap"
                      >
                        ▶ {taskMin}min
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function CookingTimeline() {
  const { entries, mealPlan } = useBatchStore();
  const { timers, start, pause, reset, fmt } = useTimers();
  const timeline = buildTimeline(entries);

  // Meal plan mode
  if (mealPlan?.batchSessions?.length > 0) {
    return <BatchSessions sessions={mealPlan.batchSessions} />;
  }

  // Empty
  if (entries.length === 0) {
    return (
      <div className="text-center py-20 text-[#8e8e93]">
        <div className="text-5xl mb-4">⏱</div>
        <p className="font-semibold text-[#1c1c1e] mb-1">Aucun plan de cuisson</p>
        <p className="text-sm">Générez un plan de repas dans l’onglet Session</p>
      </div>
    );
  }

  // Legacy recipe timeline
  return (
    <div className="space-y-3">
      {timeline.map((step, index) => {
        const timer = timers[step.id];
        const cookMin = step.cookTime || 0;
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
                      {step.parallel && <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">⚡ Parallèle</span>}
                    </div>
                  </div>

                  {cookMin > 0 && (
                    <div className="shrink-0 text-right">
                      {timer ? (
                        <div>
                          <div className={`text-xl font-mono font-bold tabular-nums ${
                            isDone ? 'text-green-500' : timer.remaining < 60 ? 'text-red-500' : 'text-[#1c1c1e]'
                          }`}>
                            {isDone ? '✓ Prêt !' : fmt(timer.remaining)}
                          </div>
                          {!isDone && (
                            <div className="flex gap-1 justify-end mt-1.5">
                              <button onClick={() => pause(step.id)} className="w-7 h-7 bg-[#f2f2f7] rounded-full flex items-center justify-center text-xs">
                                {timer.running ? '⏸' : '▶'}
                              </button>
                              <button onClick={() => reset(step.id, cookMin)} className="w-7 h-7 bg-[#f2f2f7] rounded-full flex items-center justify-center text-xs">
                                ↺
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => start(step.id, cookMin)}
                          className="bg-orange-500 text-white text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap"
                        >▶ {cookMin} min</button>
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
