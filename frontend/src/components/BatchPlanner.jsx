import React, { useState, useEffect } from 'react';
import { useBatchStore } from '../store/batchStore';
import api from '../utils/api';

const PREF_CHIPS = [
  { id: 'vegetarien', label: '🥦 Végétarien' },
  { id: 'bebe', label: '👶 Adapté bébé' },
  { id: 'sans-gluten', label: '🌾 Sans gluten' },
  { id: 'rapide', label: '⚡ Rapide' },
  { id: 'congelable', label: '❄️ Congélable' },
  { id: 'economique', label: '💶 Économique' },
  { id: 'one-pot', label: '🫕 One pot' },
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

function MealRow({ meal, icon, label }) {
  const [open, setOpen] = useState(false);
  if (!meal) return null;
  return (
    <div className="px-4 py-3 cursor-pointer select-none" onClick={() => setOpen(!open)}>
      <div className="flex items-start gap-2.5">
        <span className="text-base shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider">{label}</span>
            {meal.batchNote && (
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                ♻️ batch
              </span>
            )}
          </div>
          <p className="text-[14px] font-semibold text-[#1c1c1e] mt-0.5 leading-tight">{meal.name}</p>
          {meal.description && (
            <p className="text-xs text-[#8e8e93] mt-0.5 leading-relaxed">{meal.description}</p>
          )}
          {open && meal.batchNote && (
            <p className="text-xs text-green-700 bg-green-50 rounded-lg px-2.5 py-1.5 mt-2">
              ♻️ {meal.batchNote}
            </p>
          )}
          {(meal.prepTime > 0 || meal.cookTime > 0) && (
            <div className="flex gap-3 mt-1.5">
              {meal.prepTime > 0 && <span className="text-[11px] text-[#8e8e93]">🔪 {meal.prepTime} min</span>}
              {meal.cookTime > 0 && <span className="text-[11px] text-[#8e8e93]">🔥 {meal.cookTime} min</span>}
            </div>
          )}
        </div>
        <span className="text-[#c7c7cc] text-[10px] shrink-0 mt-1.5">{open ? '▲' : '▼'}</span>
      </div>
    </div>
  );
}

export default function BatchPlanner() {
  const {
    startDate, endDate, mealPlan, planLoading, planError, planPreferences,
    peopleCount, setPeopleCount, setDateRange, setMealPlan, setPlanLoading,
    setPlanError, setPlanPreferences, clearMealPlan,
  } = useBatchStore();

  const [activeChips, setActiveChips] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedPlan, setSavedPlan] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // Reset save state when plan changes
  useEffect(() => {
    setSavedPlan(null);
    setSaveError(null);
  }, [mealPlan]);

  const dayCount = getDayCount(startDate, endDate);
  const canGenerate = startDate && endDate && dayCount >= 1 && dayCount <= 14;

  function toggleChip(id) {
    setActiveChips((p) => p.includes(id) ? p.filter((c) => c !== id) : [...p, id]);
  }

  async function handleGenerate() {
    if (!canGenerate) return;
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
      const result = await api.post('/notion/meal-plan', {
        plan: mealPlan,
        startDate,
        endDate,
        peopleCount,
        preferences: planPreferences,
      });
      setSavedPlan(result);
    } catch (err) {
      setSaveError(err.message || 'Erreur lors de l’enregistrement');
    } finally {
      setSaving(false);
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
        {/* Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-[15px] font-semibold text-[#1c1c1e]">
              {mealPlan.days?.length ?? 0} jours · {(mealPlan.days?.length ?? 0) * 2} repas
            </p>
            <p className="text-xs text-[#8e8e93] mt-0.5">
              {mealPlan.batchSessions?.length ?? 0} session{(mealPlan.batchSessions?.length ?? 0) > 1 ? 's' : ''} batch
              {totalBatchTime > 0 ? ` · ${formatMinutes(totalBatchTime)} de prép.` : ''}
            </p>
          </div>
          <button
            onClick={clearMealPlan}
            className="text-xs bg-[#f2f2f7] text-orange-500 font-semibold px-3 py-1.5 rounded-full"
          >
            Modifier
          </button>
        </div>

        {/* Batch sessions */}
        {mealPlan.batchSessions?.length > 0 && (
          <div className="bg-orange-50 rounded-2xl border border-orange-100 p-4">
            <p className="text-[11px] font-semibold text-orange-600 uppercase tracking-wider mb-3">
              🔄 Sessions de préparation batch
            </p>
            {mealPlan.batchSessions.map((session, i) => (
              <div key={i} className={i > 0 ? 'mt-4 pt-4 border-t border-orange-200' : ''}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-[#1c1c1e]">{session.dayLabel}</p>
                    {session.label && session.label !== session.dayLabel && (
                      <p className="text-xs text-orange-700">{session.label}</p>
                    )}
                  </div>
                  {session.totalMinutes > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold">
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
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f9f9f9] border-b border-[#f2f2f7]">
              <p className="text-[13px] font-bold text-[#1c1c1e]">{day.dayLabel}</p>
            </div>
            <MealRow meal={day.lunch} icon="🌞" label="Midi" />
            <div className="border-t border-[#f2f2f7]" />
            <MealRow meal={day.dinner} icon="🌙" label="Soir" />
          </div>
        ))}

        {/* Save to Notion */}
        <div className="pt-2">
          {savedPlan ? (
            <a
              href={savedPlan.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-green-500 text-white py-3.5 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2"
            >
              ✓ Enregistré — Voir dans Notion ↗
            </a>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[#1c1c1e] text-white py-3.5 rounded-2xl font-semibold text-[15px] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement dans Notion…
                </>
              ) : (
                '💾 Enregistrer dans Notion'
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

      {planError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-3 text-sm text-red-600">{planError}</div>
      )}

      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-[16px] disabled:opacity-40 active:scale-[0.98] transition-all"
      >
        ✨ Générer le plan de repas
      </button>
    </div>
  );
}
