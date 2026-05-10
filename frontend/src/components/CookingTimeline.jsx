import React, { useState, useEffect, useRef } from 'react';
import { useBatchStore } from '../store/batchStore';
import api from '../utils/api';

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
    <div className="space-y-3">
      {sessions.map((session, si) => (
        <div key={si} className="bg-[#f9f9f9] rounded-xl overflow-hidden border border-black/5">
          <div className="px-4 pt-3 pb-2.5 border-b border-[#f2f2f7] flex items-start justify-between">
            <div>
              <p className="text-[13px] font-bold text-[#1c1c1e]">{session.dayLabel}</p>
              {session.label && session.label !== session.dayLabel && (
                <p className="text-xs text-[#8e8e93] mt-0.5">{session.label}</p>
              )}
            </div>
            {session.totalMinutes > 0 && (
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold shrink-0">
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
                className={`flex items-start gap-3 px-4 py-3 border-b last:border-b-0 border-[#f2f2f7] ${done ? 'opacity-40' : ''}`}
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
                              className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-[10px] border border-black/10"
                            >{timer.running ? '⏸' : '▶'}</button>
                            <button
                              onClick={() => reset(key, taskMin)}
                              className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-[10px] border border-black/10"
                            >↺</button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => start(key, taskMin)}
                        className="text-[11px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
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

function MealPlatingRow({ meal, icon, label, cacheKey, platingCache, platingLoading, openPlating, onTogglePlating }) {
  if (!meal?.name) return null;
  const isOpen = openPlating[cacheKey];
  const steps = platingCache[cacheKey];
  const loading = platingLoading[cacheKey];

  return (
    <div className="border-b last:border-b-0 border-[#f2f2f7]">
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">{icon}</span>
          <span className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-[14px] font-semibold text-[#1c1c1e] mb-0.5">{meal.name}</p>
        {meal.description && (
          <p className="text-xs text-[#8e8e93] leading-relaxed mb-2">{meal.description}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {meal.prepTime > 0 && (
            <span className="text-[11px] text-[#8e8e93] bg-[#f2f2f7] px-2 py-0.5 rounded-full">🔪 {meal.prepTime} min</span>
          )}
          {meal.cookTime > 0 && (
            <span className="text-[11px] text-[#8e8e93] bg-[#f2f2f7] px-2 py-0.5 rounded-full">🔥 {meal.cookTime} min</span>
          )}
          <button
            onClick={() => onTogglePlating(cacheKey, meal)}
            className="flex items-center gap-1 text-[11px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-semibold transition-opacity active:opacity-70"
          >
            🍽 Dressage
            <span className={`inline-block transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="mx-4 mb-3 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-purple-600">
              <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              Génération des étapes…
            </div>
          ) : steps?.length > 0 ? (
            <ol className="space-y-1.5">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#3a3a3c]">
                  <span className="shrink-0 text-[11px] font-bold text-purple-500 mt-0.5 w-4">{i + 1}.</span>
                  <span className="leading-relaxed">{step.replace(/^Étape \d+ ?: ?/i, '')}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-purple-500">Aucune étape disponible</p>
          )}
        </div>
      )}
    </div>
  );
}

function PlanCard({ planMeta, isActive, isExpanded, fullPlan, onToggle, platingCache, platingLoading, openPlating, onTogglePlating }) {
  const hasDays = fullPlan?.days?.length > 0;
  const hasBatch = fullPlan?.batchSessions?.length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3.5 flex items-center justify-between text-left active:opacity-70 transition-opacity"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[15px] font-bold text-[#1c1c1e] truncate">{planMeta.name}</p>
            {isActive && (
              <span className="shrink-0 text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-semibold">Actuel</span>
            )}
          </div>
          <p className="text-xs text-[#8e8e93] mt-0.5">
            {planMeta.startDate && planMeta.endDate ? `${planMeta.startDate} → ${planMeta.endDate}` : ''}
            {planMeta.peopleCount ? ` · ${planMeta.peopleCount} pers.` : ''}
          </p>
        </div>
        <span className={`ml-3 text-[#c7c7cc] text-lg transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>⌄</span>
      </button>

      {isExpanded && (
        <div className="border-t border-[#f2f2f7] p-4 space-y-4">
          {!fullPlan ? (
            <div className="flex items-center gap-2 text-sm text-[#8e8e93] py-2">
              <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              Chargement du plan…
            </div>
          ) : (
            <>
              {hasBatch && (
                <div>
                  <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">🔄 Sessions de préparation</p>
                  <BatchSessions sessions={fullPlan.batchSessions} />
                </div>
              )}

              {hasDays && (
                <div>
                  <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">🍴 Repas du plan</p>
                  <div className="space-y-2">
                    {fullPlan.days.map((day, di) => (
                      <div key={di} className="bg-[#f9f9f9] rounded-xl overflow-hidden border border-black/5">
                        <div className="px-4 py-2 bg-[#f2f2f7] border-b border-black/5">
                          <p className="text-[12px] font-bold text-[#3a3a3c]">{day.dayLabel}</p>
                        </div>
                        <MealPlatingRow
                          meal={day.lunch}
                          icon="🌞"
                          label="Midi"
                          cacheKey={`${planMeta.id}|${day.date}|lunch`}
                          platingCache={platingCache}
                          platingLoading={platingLoading}
                          openPlating={openPlating}
                          onTogglePlating={onTogglePlating}
                        />
                        <MealPlatingRow
                          meal={day.dinner}
                          icon="🌙"
                          label="Soir"
                          cacheKey={`${planMeta.id}|${day.date}|dinner`}
                          platingCache={platingCache}
                          platingLoading={platingLoading}
                          openPlating={openPlating}
                          onTogglePlating={onTogglePlating}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!hasBatch && !hasDays && (
                <p className="text-sm text-[#8e8e93] text-center py-4">Aucun détail disponible pour ce plan</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function CookingTimeline() {
  const { mealPlan } = useBatchStore();

  const [historyPlans, setHistoryPlans] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadedPlans, setLoadedPlans] = useState({});
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [platingCache, setPlatingCache] = useState({});
  const [platingLoading, setPlatingLoading] = useState({});
  const [openPlating, setOpenPlating] = useState({});

  useEffect(() => {
    setHistoryLoading(true);
    api.get('/notion/meal-plans')
      .then((plans) => setHistoryPlans(plans))
      .catch(() => setHistoryPlans([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    if (mealPlan) {
      setLoadedPlans((p) => ({ ...p, '__current__': mealPlan }));
    }
  }, [mealPlan]);

  const storePlanId = '__current__';
  const allPlans = [
    ...(mealPlan ? [{
      id: storePlanId,
      name: mealPlan.name || 'Plan en cours',
      startDate: mealPlan.startDate ?? null,
      endDate: mealPlan.endDate ?? null,
      peopleCount: mealPlan.peopleCount ?? null,
      _isActive: true,
    }] : []),
    ...historyPlans,
  ];

  async function handleToggle(planId) {
    const nowExpanded = expandedPlanId === planId ? null : planId;
    setExpandedPlanId(nowExpanded);
    if (nowExpanded && nowExpanded !== storePlanId && !loadedPlans[nowExpanded]) {
      try {
        const full = await api.get(`/notion/meal-plans/${nowExpanded}`);
        setLoadedPlans((p) => ({ ...p, [nowExpanded]: full }));
      } catch { /* silently fail */ }
    }
  }

  async function handleTogglePlating(cacheKey, meal) {
    const nowOpen = !openPlating[cacheKey];
    setOpenPlating((p) => ({ ...p, [cacheKey]: nowOpen }));
    if (nowOpen && !platingCache[cacheKey] && !platingLoading[cacheKey]) {
      setPlatingLoading((p) => ({ ...p, [cacheKey]: true }));
      try {
        const result = await api.post('/gemini/plating-steps', {
          name: meal.name,
          description: meal.description,
        });
        setPlatingCache((p) => ({ ...p, [cacheKey]: result.steps }));
      } catch {
        setPlatingCache((p) => ({ ...p, [cacheKey]: [] }));
      } finally {
        setPlatingLoading((p) => ({ ...p, [cacheKey]: false }));
      }
    }
  }

  if (!historyLoading && allPlans.length === 0) {
    return (
      <div className="text-center py-20 text-[#8e8e93]">
        <div className="text-5xl mb-4">⏱</div>
        <p className="font-semibold text-[#1c1c1e] mb-1">Aucun plan de cuisson</p>
        <p className="text-sm">Générez un plan de repas dans l'onglet Session</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {historyLoading && allPlans.length === 0 && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-white rounded-2xl border border-black/5 animate-pulse" />
          ))}
        </div>
      )}
      {allPlans.map((planMeta) => (
        <PlanCard
          key={planMeta.id}
          planMeta={planMeta}
          isActive={planMeta._isActive}
          isExpanded={expandedPlanId === planMeta.id}
          fullPlan={loadedPlans[planMeta.id] ?? null}
          onToggle={() => handleToggle(planMeta.id)}
          platingCache={platingCache}
          platingLoading={platingLoading}
          openPlating={openPlating}
          onTogglePlating={handleTogglePlating}
        />
      ))}
    </div>
  );
}
