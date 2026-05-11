import React, { useState, useEffect, useMemo } from 'react';
import { useBatchStore } from '../store/batchStore';
import api from '../utils/api';
import DriveReviewModal from './DriveReviewModal';
import RecipeModal from './RecipeModal';
import RecipePickerModal from './RecipePickerModal';

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

const LOADING_STEPS = [
  { icon: '🧠', label: 'Analyse de vos préférences…' },
  { icon: '🍽️', label: 'Création des menus de la semaine…' },
  { icon: '♻️', label: 'Optimisation des sessions batch…' },
  { icon: '🛒', label: 'Génération de la liste de courses…' },
];

const TODAY = new Date().toISOString().split('T')[0];

function getMondayOfWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().split('T')[0];
}

function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function addWeeks(weekStart, n) {
  const d = new Date(weekStart + 'T00:00:00');
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().split('T')[0];
}

function formatWeekLabel(weekStart) {
  const days = getWeekDays(weekStart);
  const first = new Date(days[0] + 'T00:00:00');
  const last = new Date(days[6] + 'T00:00:00');
  const opts = { day: 'numeric', month: 'long' };
  return `${first.toLocaleDateString('fr-FR', opts)} — ${last.toLocaleDateString('fr-FR', opts)}`;
}

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

function MealRow({ meal, icon, label, regenerating, onRegenerate, onClick, onSwap }) {
  if (!meal) return null;
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider">{label}</span>
          {meal.fromCalendar && (
            <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">📌 planifié</span>
          )}
          {meal.batchNote && !meal.fromCalendar && (
            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">♻️ batch</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {onSwap && (
            <button
              onClick={(e) => { e.stopPropagation(); onSwap(); }}
              title="Changer cette recette"
              className="w-7 h-7 flex items-center justify-center rounded-full bg-[#f2f2f7] text-xs font-bold text-[#3a3a3c]"
            >⇄</button>
          )}
          {onRegenerate && (
            <button
              onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
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
      </div>
      <div onClick={onClick} className={onClick ? 'cursor-pointer active:opacity-70 transition-opacity' : ''}>
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
        {meal.batchNote && !meal.fromCalendar && (
          <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2">
            <p className="text-xs text-green-700 leading-relaxed">♻️ {meal.batchNote}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BatchPlanner({ recipes = [], updateRecipe, addToCart }) {
  const {
    startDate, endDate, mealPlan, planLoading, planError, planPreferences,
    peopleCount, setPeopleCount, setDateRange, setMealPlan, setPlanLoading,
    setPlanError, setPlanPreferences, clearMealPlan, updateMeal, updateBatchSessionDate,
    calendarMeals, setCalendarMeal, clearCalendarMeal,
  } = useBatchStore();

  const [view, setView] = useState('calendar');
  const [calendarWeekStart, setCalendarWeekStart] = useState(() => getMondayOfWeek(TODAY));
  const [calendarPickerTarget, setCalendarPickerTarget] = useState(null);
  const [activeChips, setActiveChips] = useState([]);
  const [customPrompt, setCustomPrompt] = useState('');
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
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [swapTarget, setSwapTarget] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const existingMealsInRange = useMemo(() => {
    if (!startDate || !endDate) return [];
    return Object.entries(calendarMeals)
      .filter(([date]) => date >= startDate && date <= endDate)
      .flatMap(([date, slots]) => [
        slots?.lunch ? { date, mealType: 'lunch', name: slots.lunch.name } : null,
        slots?.dinner ? { date, mealType: 'dinner', name: slots.dinner.name } : null,
      ])
      .filter(Boolean);
  }, [calendarMeals, startDate, endDate]);

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

  useEffect(() => {
    if (!planLoading) { setLoadingStep(0); return; }
    const interval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 2800);
    return () => clearInterval(interval);
  }, [planLoading]);

  const dayCount = getDayCount(startDate, endDate);
  const canGenerate = startDate && endDate && dayCount >= 1 && dayCount <= 14;

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

  function openRecipeModal(meal) {
    if (!meal) return;
    const found = recipes.find((r) => r.name === meal.name);
    setSelectedMeal(found || { name: meal.name, prepTime: meal.prepTime, cookTime: meal.cookTime, instructions: meal.description });
  }

  function handleSwapSelect(recipe) {
    if (!swapTarget) return;
    updateMeal(swapTarget.date, swapTarget.mealType, {
      name: recipe.name,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      description: recipe.instructions?.split('\n')[0] || recipe.description || '',
      servings: recipe.servings,
      batchNote: recipe.batchNote,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
    });
    setSwapTarget(null);
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    if (overlappingPlan) {
      setPlanError(
        `Ces dates chevauchent le plan « ${overlappingPlan.name} » (${overlappingPlan.startDate} → ${overlappingPlan.endDate}). Supprimez-le d'abord ou choisissez une autre période.`
      );
      return;
    }
    const chipLabels = activeChips
      .map((id) => PREF_CHIPS.find((c) => c.id === id)?.label.replace(/^[^\s]+\s/, ''))
      .filter(Boolean)
      .join(', ');
    const prefs = [chipLabels, customPrompt.trim()].filter(Boolean).join('. ');
    setPlanPreferences(prefs);
    setPlanLoading(true);
    setPlanError(null);
    try {
      const rawPlan = await api.post('/gemini/meal-plan', {
        startDate, endDate, peopleCount, preferences: prefs,
        existingMeals: existingMealsInRange,
      });
      // Merge calendar meals into generated plan
      const merged = {
        ...rawPlan,
        days: rawPlan.days.map((day) => {
          const cal = calendarMeals[day.date];
          return {
            ...day,
            lunch: cal?.lunch ? { ...cal.lunch, fromCalendar: true } : day.lunch,
            dinner: cal?.dinner ? { ...cal.dinner, fromCalendar: true } : day.dinner,
          };
        }),
      };
      setMealPlan(merged);
      setView('generate');
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
      setView('generate');
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

  const driveItems = mealPlan?.shoppingList?.map((i) => ({
    text: i.quantity ? `${i.name} — ${i.quantity}` : i.name,
    category: i.category || 'Divers',
  })) ?? [];

  // ── View toggle (shown in all non-loading states)
  const viewToggle = (
    <div className="flex bg-[#f2f2f7] rounded-2xl p-1 mb-4">
      <button
        onClick={() => setView('calendar')}
        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
          view === 'calendar' ? 'bg-white shadow-sm text-[#1c1c1e]' : 'text-[#8e8e93]'
        }`}
      >🗓️ Calendrier</button>
      <button
        onClick={() => setView('generate')}
        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
          view === 'generate' ? 'bg-white shadow-sm text-[#1c1c1e]' : 'text-[#8e8e93]'
        }`}
      >✨ Générer</button>
    </div>
  );

  // ── Loading
  if (planLoading) {
    const progress = Math.round(((loadingStep + 1) / LOADING_STEPS.length) * 80);
    return (
      <div className="py-16 px-1">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4 animate-bounce">{LOADING_STEPS[loadingStep].icon}</div>
          <p className="text-[17px] font-bold text-[#1c1c1e] mb-1">Gemini optimise votre semaine…</p>
          <p className="text-sm text-[#8e8e93] transition-all duration-500">{LOADING_STEPS[loadingStep].label}</p>
        </div>
        <div className="bg-[#e5e5ea] rounded-full h-1.5 mb-8 overflow-hidden">
          <div
            className="bg-orange-500 h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="space-y-4">
          {LOADING_STEPS.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-3.5 transition-all duration-500 ${
                i > loadingStep ? 'opacity-25' : 'opacity-100'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                i < loadingStep ? 'bg-green-500 scale-100'
                  : i === loadingStep ? 'bg-orange-500 scale-110'
                  : 'bg-[#e5e5ea] scale-100'
              }`}>
                {i < loadingStep
                  ? <span className="text-white text-xs font-bold">✓</span>
                  : i === loadingStep
                  ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">{step.icon}</span>
                <span className={`text-[15px] font-medium transition-colors duration-300 ${
                  i === loadingStep ? 'text-[#1c1c1e]' : i < loadingStep ? 'text-[#8e8e93]' : 'text-[#c7c7cc]'
                }`}>{step.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Calendar view
  if (view === 'calendar') {
    const weekDays = getWeekDays(calendarWeekStart);
    const weekLabel = formatWeekLabel(calendarWeekStart);
    return (
      <div className="space-y-4">
        {viewToggle}

        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCalendarWeekStart(addWeeks(calendarWeekStart, -1))}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm border border-black/5 text-[#3a3a3c] text-lg"
          >‹</button>
          <p className="text-[13px] font-semibold text-[#1c1c1e] text-center leading-tight px-2">{weekLabel}</p>
          <button
            onClick={() => setCalendarWeekStart(addWeeks(calendarWeekStart, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm border border-black/5 text-[#3a3a3c] text-lg"
          >›</button>
        </div>

        {/* Days */}
        {weekDays.map((date) => {
          const isToday = date === TODAY;
          const dayMeals = calendarMeals[date] || {};
          const raw = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
          const dayLabel = raw.charAt(0).toUpperCase() + raw.slice(1);
          return (
            <div
              key={date}
              className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${
                isToday ? 'border-orange-300 ring-1 ring-orange-100' : 'border-black/5'
              }`}
            >
              <div className={`px-4 py-2.5 border-b border-[#f2f2f7] ${
                isToday ? 'bg-orange-50' : 'bg-[#f9f9f9]'
              }`}>
                <p className={`text-[13px] font-bold ${
                  isToday ? 'text-orange-600' : 'text-[#1c1c1e]'
                }`}>
                  {dayLabel}{isToday ? ' · Aujourd\'hui' : ''}
                </p>
              </div>

              {/* Lunch slot */}
              <div className="px-4 py-3 flex items-center gap-3">
                <span className="text-sm shrink-0">🌞</span>
                <span className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider w-10 shrink-0">Midi</span>
                {dayMeals.lunch ? (
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => setCalendarPickerTarget({ date, mealType: 'lunch' })}
                      className="flex-1 text-left text-sm font-medium text-[#1c1c1e] truncate active:opacity-60"
                    >{dayMeals.lunch.name}</button>
                    <button
                      onClick={() => clearCalendarMeal(date, 'lunch')}
                      className="shrink-0 text-[#c7c7cc] hover:text-red-400 transition-colors text-lg w-7 h-7 flex items-center justify-center"
                    >×</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCalendarPickerTarget({ date, mealType: 'lunch' })}
                    className="flex-1 text-left text-sm text-orange-500 font-medium"
                  >+ Ajouter</button>
                )}
              </div>

              <div className="border-t border-[#f2f2f7]" />

              {/* Dinner slot */}
              <div className="px-4 py-3 flex items-center gap-3">
                <span className="text-sm shrink-0">🌙</span>
                <span className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider w-10 shrink-0">Soir</span>
                {dayMeals.dinner ? (
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => setCalendarPickerTarget({ date, mealType: 'dinner' })}
                      className="flex-1 text-left text-sm font-medium text-[#1c1c1e] truncate active:opacity-60"
                    >{dayMeals.dinner.name}</button>
                    <button
                      onClick={() => clearCalendarMeal(date, 'dinner')}
                      className="shrink-0 text-[#c7c7cc] hover:text-red-400 transition-colors text-lg w-7 h-7 flex items-center justify-center"
                    >×</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCalendarPickerTarget({ date, mealType: 'dinner' })}
                    className="flex-1 text-left text-sm text-orange-500 font-medium"
                  >+ Ajouter</button>
                )}
              </div>
            </div>
          );
        })}

        {calendarPickerTarget && (
          <RecipePickerModal
            recipes={recipes}
            onSelect={(recipe) => {
              setCalendarMeal(calendarPickerTarget.date, calendarPickerTarget.mealType, recipe);
              setCalendarPickerTarget(null);
            }}
            onClose={() => setCalendarPickerTarget(null)}
            date={calendarPickerTarget.date}
            slot={calendarPickerTarget.mealType}
          />
        )}
      </div>
    );
  }

  // ── Plan display (generate view with active plan)
  if (mealPlan) {
    const totalBatchTime = mealPlan.batchSessions?.reduce((a, s) => a + (s.totalMinutes || 0), 0) ?? 0;
    const savings = mealPlan.savingsEstimate;
    return (
      <div className="space-y-4">
        {viewToggle}

        <button
          onClick={clearMealPlan}
          className="flex items-center gap-1.5 text-sm text-[#8e8e93] font-medium active:opacity-60 transition-opacity"
        >
          ← Nouveau plan
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 animate-page-enter">
          <p className="text-[15px] font-semibold text-[#1c1c1e]">
            {mealPlan.days?.length ?? 0} jours · {(mealPlan.days?.length ?? 0) * 2} repas
          </p>
          <p className="text-xs text-[#8e8e93] mt-0.5">
            {mealPlan.batchSessions?.length ?? 0} session{(mealPlan.batchSessions?.length ?? 0) > 1 ? 's' : ''} batch
            {totalBatchTime > 0 ? ` · ${formatMinutes(totalBatchTime)} de prép.` : ''}
          </p>
          {savings?.savings > 0 && (
            <div className="mt-3 flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
              <div>
                <p className="text-[13px] font-semibold text-green-700">~{savings.savings}€ économisés</p>
                <p className="text-[11px] text-green-600/70 mt-0.5">vs achat à l'unité (~{savings.individualTotal}€)</p>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-semibold text-[#1c1c1e]">~{savings.batchTotal}€</p>
                <p className="text-[11px] text-[#8e8e93] mt-0.5">courses batch</p>
              </div>
            </div>
          )}
        </div>

        {mealPlan.batchSessions?.length > 0 && (
          <div className="bg-orange-50 rounded-2xl border border-orange-100 p-4 animate-page-enter" style={{ animationDelay: '40ms' }}>
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
              onRegenerate={day.lunch?.fromCalendar ? null : () => handleRegenerate(day.date, 'lunch')}
              onClick={() => openRecipeModal(day.lunch)}
              onSwap={day.lunch?.fromCalendar ? null : () => setSwapTarget({ date: day.date, mealType: 'lunch' })}
            />
            <div className="border-t border-[#f2f2f7]" />
            <MealRow
              meal={day.dinner}
              icon="🌙"
              label="Soir"
              regenerating={!!regenerating[`${day.date}-dinner`]}
              onRegenerate={day.dinner?.fromCalendar ? null : () => handleRegenerate(day.date, 'dinner')}
              onClick={() => openRecipeModal(day.dinner)}
              onSwap={day.dinner?.fromCalendar ? null : () => setSwapTarget({ date: day.date, mealType: 'dinner' })}
            />
          </div>
        ))}

        <div className="pt-2 space-y-2">
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
              ) : '💾 Valider et enregistrer dans Notion'}
            </button>
          )}
          {saveError && <p className="text-xs text-red-500 text-center">{saveError}</p>}
          {driveItems.length > 0 && (
            <button
              onClick={() => setShowDriveModal(true)}
              className="w-full bg-[#f2f2f7] text-[#3a3a3c] py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
            >
              🛒 Ajouter les courses au panier Drive
            </button>
          )}
        </div>

        {showDriveModal && (
          <DriveReviewModal
            items={driveItems}
            sourceName={`Plan ${startDate ? 'du ' + startDate : ''}`}
            onConfirm={(items) => { if (addToCart) addToCart(items); setShowDriveModal(false); }}
            onClose={() => setShowDriveModal(false)}
          />
        )}

        {selectedMeal && (
          <RecipeModal
            recipe={selectedMeal}
            onClose={() => setSelectedMeal(null)}
            onUpdate={selectedMeal.notionUrl && updateRecipe ? (fields) => updateRecipe(selectedMeal.id, fields) : null}
            addToCart={addToCart}
          />
        )}

        {swapTarget && (
          <RecipePickerModal
            recipes={recipes}
            onSelect={handleSwapSelect}
            onClose={() => setSwapTarget(null)}
            slot={swapTarget.mealType}
            date={swapTarget.date}
          />
        )}
      </div>
    );
  }

  // ── Setup form (generate view, no plan)
  return (
    <div className="space-y-4">
      {viewToggle}

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
        {existingMealsInRange.length > 0 && (
          <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-700">
            📌 {existingMealsInRange.length} repas déjà planifié{existingMealsInRange.length > 1 ? 's' : ''} dans cette période seront conservés
          </div>
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
            >{chip.label}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4">
        <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-3">Instructions pour l'IA</p>
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Ex : j'ai du poulet à utiliser, évite le poisson cette semaine, budget serré…"
          rows={3}
          className="w-full rounded-xl border border-black/10 bg-[#f2f2f7] px-3.5 py-2.5 text-[15px] text-[#1c1c1e] placeholder:text-[#3c3c43]/40 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400/30"
        />
      </div>

      {(historyLoading || historyPlans.length > 0) && (
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4">
          <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-3">📋 Plans précédents</p>
          {historyLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-14 bg-[#f2f2f7] rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {historyPlans.map((plan) => (
                <div key={plan.id} className="bg-[#f2f2f7] rounded-xl px-3 py-2.5 flex items-center gap-2">
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
                        >{deletingPlanId === plan.id ? '…' : 'Suppr.'}</button>
                        <button
                          onClick={() => setConfirmDeletePlanId(null)}
                          className="text-[11px] bg-white text-[#3a3a3c] px-2.5 py-1 rounded-full font-semibold"
                        >Annuler</button>
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
                        >🗑️</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
