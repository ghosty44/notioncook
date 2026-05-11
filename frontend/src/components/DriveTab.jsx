import React, { useState, useMemo } from 'react';
import { useBatchStore } from '../store/batchStore';
import api from '../utils/api';

const CATEGORY_ORDER = [
  'Légumes & Fruits', 'Viandes & Poissons', 'Produits laitiers & Œufs',
  'Féculents & Céréales', 'Épicerie & Condiments', 'Boissons', 'Divers',
];

function groupByCategory(driveItems) {
  const g = {};
  driveItems.forEach((item) => {
    const cat = item.category || 'Divers';
    if (!g[cat]) g[cat] = [];
    g[cat].push(item);
  });
  const sorted = {};
  CATEGORY_ORDER.forEach((cat) => { if (g[cat]) sorted[cat] = g[cat]; });
  Object.keys(g).forEach((cat) => { if (!sorted[cat]) sorted[cat] = g[cat]; });
  return sorted;
}

function buildPrompt(driveItems, peopleCount) {
  const grouped = groupByCategory(driveItems);
  const lines = [
    `Va sur https://www.intermarche.com/accueil et ajoute ces articles au panier Drive pour ${peopleCount} personne${peopleCount > 1 ? 's' : ''} :\n`,
  ];
  for (const [category, items] of Object.entries(grouped)) {
    lines.push(`${category} :`);
    items.forEach((item) => lines.push(`  - ${item.text}`));
    lines.push('');
  }
  return lines.join('\n');
}

export default function DriveTab() {
  const { driveItems, removeDriveItem, clearDrive, peopleCount } = useBatchStore();
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [costEstimate, setCostEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);

  const grouped = useMemo(() => groupByCategory(driveItems), [driveItems]);

  async function handleCopy() {
    const prompt = buildPrompt(driveItems, peopleCount);
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 4000);
  }

  function handleClear() {
    if (window.confirm('Vider tout le panier ?')) {
      clearDrive();
      setCostEstimate(null);
    }
  }

  async function handleEstimateCost() {
    if (estimating || driveItems.length === 0) return;
    setEstimating(true);
    setCostEstimate(null);
    try {
      const estimate = await api.post('/gemini/estimate-cart-cost', { items: driveItems });
      setCostEstimate(estimate);
    } catch { /* silently fail */ }
    finally { setEstimating(false); }
  }

  if (driveItems.length === 0) {
    return (
      <div className="text-center py-20 text-[#8e8e93]">
        <div className="text-5xl mb-4">🛒</div>
        <p className="font-semibold text-[#1c1c1e] mb-1">Panier vide</p>
        <p className="text-sm leading-relaxed">Ajoutez des recettes depuis l'onglet Recettes<br />ou un plan depuis l'onglet Session</p>
      </div>
    );
  }

  const prompt = buildPrompt(driveItems, peopleCount);

  return (
    <div className="space-y-4">
      {/* Instruction card */}
      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-[#fff3e0] rounded-xl p-2.5 shrink-0 text-2xl">🤖</div>
          <div>
            <h2 className="text-[15px] font-semibold text-[#1c1c1e]">Remplir le panier avec Claude</h2>
            <p className="text-xs text-[#8e8e93] mt-1 leading-relaxed">
              Copiez la liste, ouvrez le widget <strong>Claude Code</strong> dans Chrome, et collez.
              Claude ira sur{' '}
              <span className="text-orange-500">intermarche.com</span>{' '}
              et remplira votre panier automatiquement.
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className={`w-full py-3.5 rounded-2xl font-semibold text-[15px] transition-all duration-200 ${
            copied ? 'bg-green-500 text-white' : 'bg-orange-500 text-white active:scale-[0.97]'
          }`}
        >
          {copied
            ? '✓ Copié !'
            : `📋 Copier pour Claude Code (${driveItems.length} article${driveItems.length > 1 ? 's' : ''})`}
        </button>

        {copied && (
          <div className="mt-3 bg-green-50 rounded-xl p-3 text-xs text-green-700 leading-relaxed border border-green-100">
            Ouvrez le widget <strong>Claude Code</strong> dans Chrome et collez{' '}
            <span className="font-mono bg-green-100 px-1 rounded">Cmd+V</span> /{' '}
            <span className="font-mono bg-green-100 px-1 rounded">Ctrl+V</span>.
            Claude va automatiquement remplir votre panier Drive 🛒
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="flex-1 text-xs text-[#8e8e93] text-center py-1"
          >
            {showPrompt ? '▲ Masquer le prompt' : '▼ Voir le prompt'}
          </button>
          <button
            onClick={handleClear}
            className="text-xs text-red-400 font-semibold py-1 px-2"
          >
            🗑️ Vider
          </button>
        </div>
      </div>

      {/* AI cost estimation */}
      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] font-semibold text-[#1c1c1e]">Estimation du coût</p>
            {costEstimate && (
              <p className="text-[13px] font-bold text-orange-500 mt-0.5">Total estimé : {costEstimate.total?.toFixed(2).replace('.', ',')} €</p>
            )}
          </div>
          <button
            onClick={handleEstimateCost}
            disabled={estimating}
            className="flex items-center gap-1.5 bg-[#f2f2f7] text-[#3a3a3c] px-3.5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-[0.97] transition-all"
          >
            {estimating ? (
              <><div className="w-3.5 h-3.5 border-2 border-[#8e8e93] border-t-transparent rounded-full animate-spin" /> Estimation…</>
            ) : '💰 Estimer le coût (IA)'}
          </button>
        </div>
      </div>

      {/* Prompt preview */}
      {showPrompt && (
        <div className="bg-[#1c1c1e] rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-[#636366] uppercase tracking-wider mb-2">Prompt</p>
          <pre className="text-xs text-[#e5e5ea] whitespace-pre-wrap leading-relaxed font-mono">
            {prompt}
          </pre>
        </div>
      )}

      {/* Shopping list */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          <div className="px-4 pt-3 pb-1">
            <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider">{category}</p>
          </div>
          {items.map((item, i) => {
            const estimatedPrice = costEstimate?.items?.find((e) => e.text === item.text)?.price;
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i < items.length - 1 ? 'border-b border-[#f2f2f7]' : ''
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                <span className="flex-1 text-sm text-[#1c1c1e]">{item.text}</span>
                {estimatedPrice != null && (
                  <span className="text-xs text-[#8e8e93] shrink-0">{estimatedPrice.toFixed(2).replace('.', ',')} €</span>
                )}
                <button
                  onClick={() => removeDriveItem(item.id)}
                  className="text-[#c7c7cc] hover:text-red-400 transition-colors text-lg w-7 h-7 flex items-center justify-center shrink-0"
                  title="Supprimer"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
