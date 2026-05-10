import React, { useRef, useState } from 'react';
import { useBatch } from '../hooks/useBatch';
import RecipeModal from './RecipeModal';

const OPTION_CHIPS = [
  { id: 'rapide-prep', label: '⚡ Rapide à faire', hint: 'prép < 15 min' },
  { id: 'rapide-cuisson', label: '🔥 Rapide à cuire', hint: 'cuisson < 20 min' },
  { id: 'air-fryer', label: '🌪️ Air fryer', hint: 'cuisson à l\'air fryer' },
  { id: 'one-pot', label: '🫕 One pot', hint: 'une seule casserole' },
  { id: 'sans-cuisson', label: '🥗 Sans cuisson', hint: 'pas de cuisson' },
  { id: 'congelable', label: '❄️ Congélable', hint: 'se congèle parfaitement' },
  { id: 'bebe', label: '👶 Adapté bébé', hint: 'sans sel, texture douce' },
  { id: 'vegetarien', label: '🥦 Végétarien', hint: 'sans viande ni poisson' },
];

const QUICK_PROMPTS = [
  'Légumes de saison, savoureux',
  'Riche en protéines',
  'Sans gluten',
  'Soupe ou ragout comfort food',
];

export default function AISuggestions({ onSaveToNotion }) {
  const [preferences, setPreferences] = useState('');
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [count, setCount] = useState(2);
  const [selected, setSelected] = useState(null);
  const [saved, setSaved] = useState({});
  const [saving, setSaving] = useState({});
  const [inputMode, setInputMode] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [linkUrl, setLinkUrl] = useState('');
  const fileInputRef = useRef(null);

  const { generateRecipes, generateFromImage, generateFromUrl, suggestions, loading, error } = useBatch();

  function toggleOption(id) {
    setSelectedOptions((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]
    );
  }

  function buildFullPreferences() {
    const optionHints = OPTION_CHIPS
      .filter((c) => selectedOptions.includes(c.id))
      .map((c) => c.hint);
    return [...optionHints, preferences.trim()].filter(Boolean).join(', ');
  }

  async function handleSave(recipe) {
    if (saved[recipe.id] || saving[recipe.id] || !onSaveToNotion) return;
    setSaving((p) => ({ ...p, [recipe.id]: true }));
    try {
      await onSaveToNotion(recipe);
      setSaved((p) => ({ ...p, [recipe.id]: true }));
    } catch {
      // silently fail
    } finally {
      setSaving((p) => ({ ...p, [recipe.id]: false }));
    }
  }

  function handleImagePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const [meta, base64] = dataUrl.split(',');
      const mimeType = meta.match(/:(.*?);/)[1];
      setImagePreview(dataUrl);
      setImageData({ base64, mimeType });
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    if (inputMode === 'photo' && imageData) {
      await generateFromImage(imageData.base64, imageData.mimeType);
      setImagePreview(null);
      setImageData(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else if (inputMode === 'link' && linkUrl.trim()) {
      await generateFromUrl(linkUrl.trim());
      setLinkUrl('');
    }
  }

  function toggleMode(mode) {
    setInputMode((prev) => (prev === mode ? null : mode));
  }

  const canGenerate = !loading && (selectedOptions.length > 0 || preferences.trim().length > 0);
  const canAnalyze = !loading && (
    (inputMode === 'photo' && imageData != null) ||
    (inputMode === 'link' && linkUrl.trim().length > 0)
  );

  return (
    <div>
      {/* Text-based generation card */}
      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 mb-4">
        <p className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">Options</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {OPTION_CHIPS.map((chip) => {
            const active = selectedOptions.includes(chip.id);
            return (
              <button
                key={chip.id}
                onClick={() => toggleOption(chip.id)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  active
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                    : 'bg-[#f2f2f7] text-[#1c1c1e] border-transparent hover:border-orange-200'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <div className="border-t border-[#f2f2f7] mb-4" />

        <p className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">Inspiration</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => setPreferences(preferences === p ? '' : p)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                preferences === p
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'border-orange-200 text-orange-600 hover:bg-orange-50'
              }`}
            >{p}</button>
          ))}
        </div>

        <textarea
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          placeholder="Décrivez vos préférences supplémentaires…"
          rows={2}
          className="w-full bg-[#f2f2f7] rounded-xl px-3 py-2.5 text-sm placeholder-[#8e8e93] outline-none resize-none"
        />

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8e8e93]">Recettes :</span>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`w-7 h-7 rounded-full text-xs font-semibold transition-colors ${
                  count === n ? 'bg-orange-500 text-white' : 'bg-[#f2f2f7] text-[#1c1c1e]'
                }`}
              >{n}</button>
            ))}
          </div>
          <button
            onClick={() => generateRecipes(buildFullPreferences(), count)}
            disabled={!canGenerate}
            className="bg-orange-500 text-white px-5 py-2 rounded-full font-semibold text-sm disabled:opacity-40 transition-opacity"
          >
            {loading ? '⏳ Génération…' : '✨ Générer'}
          </button>
        </div>
      </div>

      {/* Photo / Link card */}
      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 mb-5">
        <p className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-3">Depuis une image ou un lien</p>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => toggleMode('photo')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              inputMode === 'photo' ? 'bg-orange-500 text-white' : 'bg-[#f2f2f7] text-[#1c1c1e]'
            }`}
          >📸 Photo</button>
          <button
            onClick={() => toggleMode('link')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              inputMode === 'link' ? 'bg-orange-500 text-white' : 'bg-[#f2f2f7] text-[#1c1c1e]'
            }`}
          >🔗 Lien</button>
        </div>

        {inputMode === 'photo' && (
          <div className="mb-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImagePick}
              className="hidden"
            />
            {imagePreview ? (
              <div className="flex items-center gap-3">
                <img src={imagePreview} alt="Aperçu" className="w-20 h-20 rounded-xl object-cover border border-black/5" />
                <div>
                  <p className="text-sm text-[#1c1c1e] font-medium mb-1">Photo sélectionnée</p>
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setImageData(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-xs text-orange-500 font-semibold"
                  >Changer</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-[#e5e5ea] rounded-xl text-[#8e8e93] text-sm hover:border-orange-300 hover:text-orange-400 transition-colors"
              >
                📷 Appuyer pour choisir une photo
              </button>
            )}
          </div>
        )}

        {inputMode === 'link' && (
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://www.marmiton.org/recette…"
            className="w-full bg-[#f2f2f7] rounded-xl px-3 py-2.5 text-sm placeholder-[#8e8e93] outline-none mb-3"
          />
        )}

        {inputMode && (
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 transition-opacity"
          >
            {loading ? '⏳ Analyse en cours…' : '✨ Analyser'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 rounded-2xl p-4 mb-4 text-sm border border-red-100">{error}</div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((recipe) => (
            <div key={recipe.id} className="bg-white rounded-2xl shadow-sm border border-black/5 p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold text-[#1c1c1e] leading-tight">{recipe.name}</h3>
                {recipe.babyAdaptation && <span className="shrink-0">👶</span>}
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-[#8e8e93] mb-2">
                {recipe.category && <span className="bg-[#f2f2f7] px-2.5 py-1 rounded-full">{recipe.category}</span>}
                {recipe.prepTime > 0 && <span>🔪 {recipe.prepTime} min</span>}
                {recipe.cookTime > 0 && <span>🔥 {recipe.cookTime} min</span>}
                {recipe.storageDays > 0 && <span>🗓 {recipe.storageDays}j {recipe.storageMethod || ''}</span>}
              </div>

              {recipe.storageTips && (
                <p className="text-xs text-[#8e8e93] italic mb-3">{recipe.storageTips}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(recipe)}
                  className="flex-1 text-sm bg-[#f2f2f7] text-[#1c1c1e] py-2.5 rounded-xl font-medium"
                >Voir</button>
                {onSaveToNotion && (
                  <button
                    onClick={() => handleSave(recipe)}
                    disabled={saved[recipe.id] || saving[recipe.id]}
                    className={`flex-1 text-sm py-2.5 rounded-xl font-semibold transition-all ${
                      saved[recipe.id]
                        ? 'bg-green-500 text-white'
                        : saving[recipe.id]
                        ? 'bg-[#f2f2f7] text-[#8e8e93]'
                        : 'bg-orange-500 text-white'
                    }`}
                  >
                    {saving[recipe.id] ? '…' : saved[recipe.id] ? '✓ Sauvegardé' : '💾 Ajouter à Notion'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <RecipeModal recipe={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
