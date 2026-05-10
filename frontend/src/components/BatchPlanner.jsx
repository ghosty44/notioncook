import React, { useState, useEffect } from 'react';
import { useBatchStore } from '../store/batchStore';
import api from '../utils/api';

const PREF_CHIPS = [
  { id: 'vegetarien', label: '🥦 Végétarien' },
  { id: 'bebe', label: '👶 Adapté bébé' },
  { id: 'sans-gluten', label: '🌾 Sans gluten' },
  { id: 'rapide', label: '⚡ Rapide' },
  { id: 'congelable', label: '❄️ Congélable' },
  { id: 'petit-budget', label: '💰 Petit budget' },
  { id: 'one-pot', label: '🫕 One pot' },
  { id: 'simple', label: '👌 Préparation simple' },
];

function getDayCount(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return Math.max(0, Math.round((e - s) / 86400000) + 1);
}

function formatMinutes(min) {
  if (!min) return '';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${m}` : `${h}h`;
}

function MealRow({ meal, icon, label, regenerating, onRegenerate }) {
  if (!meal) return null;
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider">{label}</span>
          {meal.batchNote && (
            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">♻️ batch</span>
          )}
        </div>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            title="Régénérer ce repas"
            className="w-7 h-7 flex items-center justify-center rounded-full bg-[#f2f2f7] disabled:opacity-50 transition-opacity"
          >
            {regenerating
              ? <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              : <span className="text-sm">🔄</span>}
          </button>
        )}
      </div>
      <p className="text-[15px] font-bold text-[#1c1c1e] leading-tight mb-1">{meal.name}</p>
      {meal.description && (
        <p className="text-xs text-[#8e8e93] leading-relaxed mb-2">{meal.description}</p>
      )}
      {(meal.prepTime > 0 || meal.cookTime > 0) && (
        <div className="flex gap-2 flex-wrap mb-2">
          {meal.prepTime > 0 && (
            <span className="text-[11px] text-[#8e8e93] bg-[#f2f2f7] px-2 py-1 rounded-full">🔪 {meal.prepTime} min</span>
          )}
          {meal.cookTime > 0 && (
            <span className="text-[11px] text-[#8e8e93] bg-[#f2f2f7] px-2 py-1 rounded-full">🔥 {meal.cookTime} min</span>
          )}
        </div>
      )}
      {meal.batchNote && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2">
          <p className="text-xs text-green-700 leading-relaxed">♻️ {meal.batchNote}</p>
        </div>
      )}
    </div>
  );
}

export default function BatchPlanner() {
  const {
    startDate, endDate, mealPlan, planLoading, planError, planPreferences,
    peopleCount, setPeopleCount, setDateRange, setMealPlan, setPlanLoading,
    setPlanError, setPlanPreferences, clearMealPlan, updateMeal, updateBatchSessionDate,
  } = useBatchStore();

  const [activeChips, setActiveChips] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savingStep, setSavingStep] = useState(null);
  const [savedPlan, setSavedPlan] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [regenerating, setRegenerating] = useState({});
  const [historyPlans, setHistoryPlans] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState(null);
  const [confirmDeletePlanId, setConfirmDeletePlanId] = useState(null);
  const [deletingPlanId, setDeletingPlanId] = useState(null);
  const [editingBatchDateIndex, setEditingBatchDateIndex] = useState(null);

  useEffect(() => {
    setSavedPlan(null);
    setSaveError(null);
  }, [mealPlan]);

  useEffect(() => {
    if (mealPlan) return;
    setHistoryLoading(true);
    api.get('/notion/meal-plans')
      .then((plans) => setHistoryPlans(plans))
      .catch(() => setHistoryPlans([]))
      .finally(() => setHistoryLoading(false));
  }, [mealPlan]);

  const dayCount = getDayCount(startDate, endDate);
  const canGenerate = startDate && endDate && dayCount >= 1 && dayCount <= 14;
  const today = new Date().toISOString().split('T')[0];
  const todayDay = mealPlan?.days?.find((d) => d.date === today);

  const overlappingPlan = startDate && endDate
    ? historyPlans.find((p) => {
        if (!p.startDate || !p.endDate) return false;
        if (p.startDate === startDate && p.endDate === endDate) return false;
        return startDate <= p.endDate && endDate >= p.startDate;
      })
    : null;

  function toggleChip(id) {
    setActiveChips((p) => p.includes(id) ? p.filter((c) => c !== id) : [...p, id]);
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    if (overlappingPlan) {
      setPlanError(
        `Ces dates chevauchent le plan « ${overlappingPlan.name} » (${overlappingPlan.startDate} → ${overlappingPlan.endDate}). Supprimez-le d'abord ou choisissez une autre période.`
      );
      return;
    }
    const prefs = activeChips
      .map((id) => PREF_CHIPS.find((c) => c.id === id)?.label.replace(/^[^\s]+\s/, ''))
      .filter(Boolean)
      .join(', ');
    setPlanPreferences(prefs);
    setPlanLoading(true);
    setPlanError(null);
    try {
      const plan = await api.post('/gemini/meal-plan', { startDate, endDate, peopleCount, preferences: prefs });
      setMealPlan(plan);
    } catch (err) {
      setPlanError(err.message || 'Erreur lors de la génération');
    }
  }

  async function handleSave() {
    if (saving || savedPlan) return;
    setSaving(true);
    setSaveError(null);
    try {
      setSavingStep('recipes');
      const allMeals = mealPlan.days.flatMap((day) => [day.lunch, day.dinner]).filter((m) => m?.name);
      await Promise.all(allMeals.map(async (meal) => {
        try {
          const recipe = await api.post('/gemini/expand-meal', {
            name: meal.name,
            description: meal.description,
            batchNote: meal.batchNote,
            prepTime: meal.prepTime,
            cookTime: meal.cookTime,
            peopleCount,
            preferences: planPreferences,
          });
          await api.post('/notion/recipes', recipe);
        } catch { /* échec silencieux par recette */ }
      }));
      setSavingStep('plan');
      const result = await api.post('/notion/meal-plan', {
        plan: mealPlan, startDate, endDate, peopleCount, preferences: planPreferences,
      });
      setSavedPlan(result);
    } catch (err) {
      setSaveError(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
      setSavingStep(null);
    }
  }

  async function handleRegenerate(date, mealType) {
    const key = `${date}-${mealType}`;
    setRegenerating((r) => ({ ...r, [key]: true }));
    try {
      const meal = await api.post('/gemini/regenerate-meal', {
        date, mealType, currentPlan: mealPlan, peopleCount, preferences: planPreferences,
      });
      updateMeal(date, mealType, meal);
    } catch { /* silently fail */ }
    finally {
      setRegenerating((r) => { const next = { ...r }; delete next[key]; return next; });
    }
  }

  async function handleLoadHistory(plan) {
    setLoadingPlanId(plan.id);
    try {
      const fullPlan = await api.get(`/notion/meal-plans/${plan.id}`);
      setMealPlan(fullPlan);
      if (plan.startDate) setDateRange(plan.startDate, plan.endDate);
    } catch { /* silently fail */ }
    finally { setLoadingPlanId(null); }
  }

  async function handleDeletePlan(planId) {
    setDeletingPlanId(planId);
    try {
      await api.delete(`/notion/meal-plans/${planId}`);
      setHistoryPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch { /* silently fail */ }
    finally {
      setDeletingPlanId(null);
      setConfirmDeletePlanId(null);
    }
  }

  // ── Loading ─────────────────────────────────────────────
  if (planLoading) {
    return (
      <div className="text-center py-28">
        <div className="text-5xl mb-5 animate-pulse">✨</div>
        <p className="text-[17px] font-semibold text-[#1c1c1e] mb-2">Gemini optimise votre semaine…</p>
        <p className="text-sm text-[#8e8e93] leading-relaxed">
          Analyse des batchs possibles,<br />
          variété des repas, liste de courses…
        </p>
      </div>
    );
  }

  // ── Plan display ─────────────────────────────────────────
  if (mealPlan) {
    const totalBatchTime = mealPlan.batchSessions?.reduce((a, s) => a + (s.totalMinutes || 0), 0) ?? 0;
    return (
      <div className="space-y-4">

        {/* Back button */}
        <button
          onClick={clearMealPlan}
          className="flex items-center gap-1.5 text-sm text-[#8e8e93] font-medium active:opacity-60 transition-opacity"
        >
          ← Nouveau plan
        </button>

        {/* Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 animate-page-enter">
          <p className="text-[15px] font-semibold text-[#1c1c1e]">
            {mealPlan.days?.length ?? 0} jours · {(mealPlan.days?.length ?? 0) * 2} repas
          </p>
          <p className="text-xs text-[#8e8e93] mt-0.5">
            {mealPlan.batchSessions?.length ?? 0} session{(mealPlan.batchSessions?.length ?? 0) > 1 ? 's' : ''} batch
            {totalBatchTime > 0 ? ` · ${formatMinutes(totalBatchTime)} de prép.` : ''}
          </p>
        </div>

        {/* Today banner */}
        {todayDay && (
          <div
            className="bg-orange-50 rounded-2xl border border-orange-200 overflow-hidden animate-page-enter"
            style={{ animationDelay: '40ms' }}
          >
            <div className="px-4 pt-3 pb-1">
              <p className="text-[11px] font-semibold text-orange-600 uppercase tracking-wider">📅 Aujourd'hui</p>
            </div>
            <MealRow meal={todayDay.lunch} icon="🌞" label="Midi" />
            <div className="border-t border-orange-100" />
            <MealRow meal={todayDay.dinner} icon="🌙" label="Soir" />
          </div>
        )}

        {/* Batch sessions */}
        {mealPlan.batchSessions?.length > 0 && (
          <div
            className="bg-orange-50 rounded-2xl border border-orange-100 p-4 animate-page-enter"
            style={{ animationDelay: '80ms' }}
          >
            <p className="text-[11px] font-semibold text-orange-600 uppercase tracking-wider mb-3">
              🔄 Sessions de préparation batch
            </p>
            {mealPlan.batchSessions.map((session, i) => (
              <div key={i} className={i > 0 ? 'mt-4 pt-4 border-t border-orange-200' : ''}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    {editingBatchDateIndex === i ? (
                      <input
                        type="date"
                        defaultValue={session.date}
                        autoFocus
                        onChange={(e) => {
                          if (e.target.value) {
                            updateBatchSessionDate(i, e.target.value);
                            setEditingBatchDateIndex(null);
                          }
                        }}
                        onBlur={() => setEditingBatchDateIndex(null)}
                        className="bg-white border border-orange-300 rounded-lg px-2 py-1 text-sm outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => setEditingBatchDateIndex(i)}
                        title="Modifier la date de cette session"
                        className="group flex items-center gap-1.5 text-sm font-bold text-[#1c1c1e]"
                      >
                        {session.dayLabel}
                        <span className="text-[11px] text-[#c7c7cc] group-hover:text-orange-400 transition-colors">✏️</span>
                      </button>
                    )}
                    {session.label && session.label !== session.dayLabel && (
                      <p className="text-xs text-orange-700 mt-0.5">{session.label}</p>
                    )}
                  </div>
                  {session.totalMinutes > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold shrink-0">
                      ⏱ {formatMinutes(session.totalMinutes)}
                    </span>
                  )}
                </div>
                <ul className="space-y-1.5">
                  {session.tasks.map((task, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-[#3a3a3c]">
                      <span className="text-orange-400 mt-0.5 shrink-0">•</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Days */}
        {mealPlan.days?.map((day, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden animate-page-enter"
            style={{ animationDelay: `${(i + 2) * 40}ms` }}
          >
            <div className="px-4 py-2.5 bg-[#f9f9f9] border-b border-[#f2f2f7]">
              <p className="text-[13px] font-bold text-[#1c1c1e]">{day.dayLabel}</p>
            </div>
            <MealRow
              meal={day.lunch}
              icon="🌞"
              label="Midi"
              regenerating={!!regenerating[`${day.date}-lunch`]}
              onRegenerate={() => handleRegenerate(day.date, 'lunch')}
            />
            <div className="border-t border-[#f2f2f7]" />
            <MealRow
              meal={day.dinner}
              icon="🌙"
              label="Soir"
              regenerating={!!regenerating[`${day.date}-dinner`]}
              onRegenerate={() => handleRegenerate(day.date, 'dinner')}
            />
          </div>
        ))}

        {/* Save to Notion */}
        <div className="pt-2">
          {savedPlan ? (
            <div className="space-y-2">
              <a
                href={savedPlan.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-green-500 text-white py-3.5 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2"
              >
                ✓ Enregistré — Voir dans Notion ↗
              </a>
              <button
                onClick={async () => {
                  if (!window.confirm('Supprimer ce plan de Notion ?')) return;
                  try {
                    await api.delete(`/notion/meal-plans/${savedPlan.id}`);
                    setSavedPlan(null);
                    clearMealPlan();
                  } catch { /* silently fail */ }
                }}
                className="w-full bg-[#f2f2f7] text-red-500 py-2.5 rounded-2xl font-semibold text-sm"
              >
                🗑️ Supprimer de Notion
              </button>
            </div>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[#1c1c1e] text-white py-3.5 rounded-2xl font-semibold text-[15px] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {savingStep === 'recipes' ? 'Génération des recettes…' : 'Enregistrement dans Notion…'}
                </>
              ) : (
                '💾 Valider et enregistrer dans Notion'
              )}
            </button>
          )}
          {saveError && (
            <p className="text-xs text-red-500 text-center mt-2">{saveError}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Setup form ──────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4">
        <h2 className="text-[15px] font-semibold text-[#1c1c1e] mb-4">Période du plan</h2>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider">Du</label>
            <input
              type="date"
              value={startDate || ''}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                const s = e.target.value;
                setDateRange(s, endDate && endDate >= s ? endDate : s);
              }}
              className="mt-1 w-full bg-[#f2f2f7] rounded-xl px-3 py-3 text-sm text-[#1c1c1e] outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider">Au</label>
            <input
              type="date"
              value={endDate || ''}
              min={startDate || new Date().toISOString().split('T')[0]}
              onChange={(e) => setDateRange(startDate, e.target.value)}
              className="mt-1 w-full bg-[#f2f2f7] rounded-xl px-3 py-3 text-sm text-[#1c1c1e] outline-none"
            />
          </div>
        </div>
        {startDate && endDate && dayCount > 0 && (
          <p className="text-xs text-[#8e8e93] mt-3 text-center">
            {dayCount} jour{dayCount > 1 ? 's' : ''} · {dayCount * 2} repas
          </p>
        )}
        {dayCount > 14 && (
          <p className="text-xs text-red-500 mt-2 text-center">Maximum 14 jours</p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 flex items-center justify-between">
        <div>
          <p className="text-[15px] font-semibold text-[#1c1c1e]">Nombre de personnes</p>
          <p className="text-xs text-[#8e8e93] mt-0.5">Quantités adaptées automatiquement</p>
        </div>
        <div className="flex items-center gap-3 bg-[#f2f2f7] rounded-full px-3 py-1.5">
          <button onClick={() => setPeopleCount(peopleCount - 1)} className="w-6 h-6 flex items-center justify-center text-orange-500 font-bold text-xl select-none">−</button>
          <span className="text-base font-semibold text-[#1c1c1e] w-5 text-center tabular-nums">{peopleCount}</span>
          <button onClick={() => setPeopleCount(peopleCount + 1)} className="w-6 h-6 flex items-center justify-center text-orange-500 font-bold text-xl select-none">+</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4">
        <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-3">Préférences</p>
        <div className="flex flex-wrap gap-2">
          {PREF_CHIPS.map((chip) => (
            <button
              key={chip.id}
              onClick={() => toggleChip(chip.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeChips.includes(chip.id) ? 'bg-orange-500 text-white' : 'bg-[#f2f2f7] text-[#3a3a3c]'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* History */}
      {(historyLoading || historyPlans.length > 0) && (
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4">
          <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-3">📋 Plans précédents</p>
          {historyLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 bg-[#f2f2f7] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {historyPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-[#f2f2f7] rounded-xl px-3 py-2.5 flex items-center gap-2"
                >
                  <button
                    onClick={() => handleLoadHistory(plan)}
                    disabled={loadingPlanId === plan.id || deletingPlanId === plan.id}
                    className="flex-1 text-left min-w-0 active:opacity-70 transition-opacity disabled:opacity-40"
                  >
                    <p className="text-sm font-semibold text-[#1c1c1e] truncate">{plan.name}</p>
                    {plan.peopleCount && (
                      <p className="text-xs text-[#8e8e93]">👤 {plan.peopleCount} personne{plan.peopleCount > 1 ? 's' : ''}</p>
                    )}
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {confirmDeletePlanId === plan.id ? (
                      <>
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          disabled={deletingPlanId === plan.id}
                          className="text-[11px] bg-red-500 text-white px-2.5 py-1 rounded-full font-semibold"
                        >
                          {deletingPlanId === plan.id ? '…' : 'Suppr.'}
                        </button>
                        <button
                          onClick={() => setConfirmDeletePlanId(null)}
                          className="text-[11px] bg-white text-[#3a3a3c] px-2.5 py-1 rounded-full font-semibold"
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <>
                        {loadingPlanId === plan.id
                          ? <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                          : <span className="text-[#c7c7cc] text-sm">→</span>}
                        <button
                          onClick={() => setConfirmDeletePlanId(plan.id)}
                          title="Supprimer de Notion"
                          className="text-[#c7c7cc] text-base hover:text-red-400 transition-colors"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Overlap warning */}
      {overlappingPlan && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-sm text-amber-700">
          ⚠️ Ces dates chevauchent « {overlappingPlan.name} » ({overlappingPlan.startDate} → {overlappingPlan.endDate}).
          Supprimez ce plan ou choisissez une autre période.
        </div>
      )}

      {planError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-3 text-sm text-red-600">{planError}</div>
      )}

      <button
        onClick={handleGenerate}
        disabled={!canGenerate || !!overlappingPlan}
        className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-[16px] disabled:opacity-40 active:scale-[0.98] transition-all"
      >
        ✨ Générer le plan de repas
      </button>
    </div>
  );
}
