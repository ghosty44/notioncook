import React, { useState, useMemo } from 'react';
import { useBatchStore } from '../store/batchStore';
import { generateShoppingList, formatIngredientLine } from '../utils/shoppingListUtils';

function buildPrompt(shoppingList, peopleCount) {
  const lines = [
    `Va sur https://www.intermarche.com/accueil et ajoute ces articles au panier Drive pour ${peopleCount} personne${peopleCount > 1 ? 's' : ''} :\n`,
  ];
  for (const [category, items] of Object.entries(shoppingList)) {
    lines.push(`${category} :`);
    items.forEach((item) => lines.push(`  - ${formatIngredientLine(item)}`));
    lines.push('');
  }
  return lines.join('\n');
}

export default function DriveTab() {
  const { entries, peopleCount } = useBatchStore();
  const shoppingList = useMemo(() => generateShoppingList(entries, peopleCount), [entries, peopleCount]);
  const allIngredients = Object.values(shoppingList).flat();
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  async function handleCopy() {
    const prompt = buildPrompt(shoppingList, peopleCount);
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

  if (allIngredients.length === 0) {
    return (
      <div className="text-center py-20 text-[#8e8e93]">
        <div className="text-5xl mb-4">🛍️</div>
        <p className="font-semibold text-[#1c1c1e] mb-1">Liste de courses vide</p>
        <p className="text-sm">Ajoutez des recettes à la session pour générer la liste</p>
      </div>
    );
  }

  const prompt = buildPrompt(shoppingList, peopleCount);

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
            copied
              ? 'bg-green-500 text-white'
              : 'bg-orange-500 text-white active:scale-[0.97]'
          }`}
        >
          {copied
            ? '✓ Copié !'
            : `📋 Copier pour Claude Code (${allIngredients.length} articles)`}
        </button>

        {copied && (
          <div className="mt-3 bg-green-50 rounded-xl p-3 text-xs text-green-700 leading-relaxed border border-green-100">
            Ouvrez le widget <strong>Claude Code</strong> dans Chrome et collez{' '}
            <span className="font-mono bg-green-100 px-1 rounded">Cmd+V</span> /{' '}
            <span className="font-mono bg-green-100 px-1 rounded">Ctrl+V</span>.
            Claude va automatiquement remplir votre panier Drive 🛒
          </div>
        )}

        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="w-full mt-3 text-xs text-[#8e8e93] text-center py-1"
        >
          {showPrompt ? '▲ Masquer le prompt' : '▼ Voir le prompt'}
        </button>
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
      {Object.entries(shoppingList).map(([category, items]) => (
        <div key={category} className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          <div className="px-4 pt-3 pb-1">
            <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider">{category}</p>
          </div>
          {items.map((item, i) => (
            <div
              key={item.key}
              className={`flex items-center gap-3 px-4 py-3 ${
                i < items.length - 1 ? 'border-b border-[#f2f2f7]' : ''
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
              <span className="flex-1 text-sm text-[#1c1c1e]">{item.text}</span>
              {item.count !== 1 && (
                <span className="text-xs font-medium text-[#8e8e93] shrink-0">
                  ×{Math.round(item.count * 10) / 10}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
