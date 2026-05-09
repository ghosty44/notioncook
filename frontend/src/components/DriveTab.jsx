import React, { useState, useEffect, useMemo } from 'react';
import { useBatchStore } from '../store/batchStore';
import { generateShoppingList } from '../utils/shoppingListUtils';
import api from '../utils/api';

const STEP = { STORE: 'store', LOGIN: 'login', CART: 'cart' };

export default function DriveTab() {
  const { entries, peopleCount } = useBatchStore();
  const shoppingList = useMemo(() => generateShoppingList(entries, peopleCount), [entries, peopleCount]);
  const allIngredients = Object.values(shoppingList).flat();

  const [apiStatus, setApiStatus] = useState(null);
  const [step, setStep] = useState(STEP.STORE);
  const [storeQuery, setStoreQuery] = useState('');
  const [stores, setStores] = useState([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [cartId, setCartId] = useState(null);
  const [itemStatus, setItemStatus] = useState({});
  const [globalLoading, setGlobalLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check API status on mount
  useEffect(() => {
    api.get('/intermarche/status')
      .then((d) => setApiStatus(d))
      .catch(() => setApiStatus({ configured: false }));
  }, []);

  async function searchStores() {
    if (!storeQuery.trim()) return;
    setStoresLoading(true);
    setError(null);
    try {
      const data = await api.get(`/intermarche/stores?q=${encodeURIComponent(storeQuery)}`);
      const list = Array.isArray(data) ? data : (data.stores || data.results || []);
      setStores(list);
    } catch (err) {
      setError(err.message);
      setStores([]);
    } finally {
      setStoresLoading(false);
    }
  }

  function selectStore(store) {
    setSelectedStore(store);
    setStep(STEP.LOGIN);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginLoading(true);
    setError(null);
    try {
      const data = await api.post('/intermarche/auth', { email, password });
      const token = data.access_token || data.accessToken || data.token || data.userToken;
      setUserToken(token);
      // Create cart for selected store
      const cart = await api.post('/intermarche/cart', { storeId: selectedStore.id, userToken: token });
      setCartId(cart.id || cart.cartId || cart.code);
      setStep(STEP.CART);
    } catch (err) {
      setError('Connexion échouée : ' + err.message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function addItem(ingredient) {
    setItemStatus((p) => ({ ...p, [ingredient.key]: 'loading' }));
    try {
      await api.post('/intermarche/cart/items', {
        cartId,
        userToken,
        query: ingredient.text,
        quantity: Math.max(1, Math.ceil(ingredient.count)),
      });
      setItemStatus((p) => ({ ...p, [ingredient.key]: 'done' }));
    } catch {
      setItemStatus((p) => ({ ...p, [ingredient.key]: 'error' }));
    }
  }

  async function addAll() {
    setGlobalLoading(true);
    for (const ing of allIngredients) {
      if (itemStatus[ing.key] !== 'done') await addItem(ing);
    }
    setGlobalLoading(false);
  }

  function reset() {
    setStep(STEP.STORE);
    setSelectedStore(null);
    setUserToken(null);
    setCartId(null);
    setItemStatus({});
    setError(null);
  }

  const doneCount = Object.values(itemStatus).filter((s) => s === 'done').length;
  const pending = apiStatus && !apiStatus.configured;

  // ── Pending banner ──────────────────────────────────────────────
  const PendingBanner = () => (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
      <div className="flex gap-3">
        <span className="text-xl">⏳</span>
        <div>
          <p className="text-sm font-semibold text-amber-800">APIs en attente d'approbation</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Vos demandes d’accès à <strong>API Carts</strong>, <strong>API Users</strong> et <strong>API Stores</strong> sont soumises.
            L’onglet Drive sera fonctionnel dès validation par Intermarché.
          </p>
        </div>
      </div>
    </div>
  );

  // ── No items ────────────────────────────────────────────────────
  if (allIngredients.length === 0) {
    return (
      <div>
        {pending && <PendingBanner />}
        <div className="text-center py-20 text-[#8e8e93]">
          <div className="text-5xl mb-4">🛍️</div>
          <p className="font-medium mb-1">Liste de courses vide</p>
          <p className="text-sm">Ajoutez des recettes dans la session pour remplir le panier</p>
        </div>
      </div>
    );
  }

  // ── Step: Store selection ────────────────────────────────────────
  if (step === STEP.STORE) {
    return (
      <div>
        {pending && <PendingBanner />}

        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 mb-4">
          <h2 className="text-[15px] font-semibold text-[#1c1c1e] mb-1">Choisissez votre magasin</h2>
          <p className="text-xs text-[#8e8e93] mb-4">Recherchez votre Intermarché pour le Drive</p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e8e93] text-sm">🔍</span>
              <input
                type="text"
                placeholder="Ville, code postal…"
                value={storeQuery}
                onChange={(e) => setStoreQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchStores()}
                className="w-full bg-[#f2f2f7] rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder-[#8e8e93] outline-none"
              />
            </div>
            <button
              onClick={searchStores}
              disabled={storesLoading || !storeQuery.trim()}
              className="bg-orange-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-40"
            >
              {storesLoading ? '…' : 'Chercher'}
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 rounded-2xl p-3 text-sm mb-4 border border-red-100">{error}</div>}

        {stores.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
            {stores.map((store, i) => (
              <button
                key={store.id || i}
                onClick={() => selectStore(store)}
                className={`w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-[#f2f2f7] transition-colors ${
                  i < stores.length - 1 ? 'border-b border-[#f2f2f7]' : ''
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-[#1c1c1e]">{store.name || store.storeName}</p>
                  <p className="text-xs text-[#8e8e93]">{store.address || store.city || ''}</p>
                </div>
                <span className="text-[#8e8e93] text-sm">›</span>
              </button>
            ))}
          </div>
        )}

        {stores.length === 0 && storeQuery && !storesLoading && (
          <div className="text-center py-10 text-[#8e8e93] text-sm">Aucun magasin trouvé</div>
        )}
      </div>
    );
  }

  // ── Step: Login ─────────────────────────────────────────────────
  if (step === STEP.LOGIN) {
    return (
      <div>
        {pending && <PendingBanner />}

        <button onClick={() => setStep(STEP.STORE)} className="flex items-center gap-1 text-orange-500 text-sm font-medium mb-4">
          ‹ {selectedStore?.name || 'Magasin'}
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-5">
          <div className="flex items-center justify-center mb-5">
            <div className="bg-orange-100 rounded-2xl p-4">
              <span className="text-4xl">🛍️</span>
            </div>
          </div>

          <h2 className="text-[17px] font-bold text-[#1c1c1e] text-center mb-1">Connexion Intermarché</h2>
          <p className="text-xs text-[#8e8e93] text-center mb-5">Connectez votre compte pour accéder au Drive</p>

          {error && <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm mb-4 border border-red-100">{error}</div>}

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[#8e8e93] uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.fr"
                required
                className="mt-1 w-full bg-[#f2f2f7] rounded-xl px-3 py-3 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#8e8e93] uppercase tracking-wider">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1 w-full bg-[#f2f2f7] rounded-xl px-3 py-3 text-sm outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-orange-500 text-white py-3.5 rounded-2xl font-semibold text-[15px] disabled:opacity-40 mt-1"
            >
              {loginLoading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <p className="text-xs text-[#8e8e93] text-center mt-4">
            Vos identifiants transitent uniquement par votre serveur.
            <br />Ils ne sont jamais stockés.
          </p>
        </div>
      </div>
    );
  }

  // ── Step: Cart ───────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-[#8e8e93]">{selectedStore?.name}</p>
          <p className="text-xs text-green-600 font-medium">✓ Connecté</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#8e8e93]">{doneCount}/{allIngredients.length} ajoutés</span>
          <button onClick={reset} className="text-xs text-orange-500 font-semibold">Changer</button>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-[#e5e5ea] rounded-full h-1.5 mb-4">
        <div
          className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${allIngredients.length ? (doneCount / allIngredients.length) * 100 : 0}%` }}
        />
      </div>

      {/* Add all button */}
      <button
        onClick={addAll}
        disabled={globalLoading || doneCount === allIngredients.length}
        className="w-full bg-orange-500 text-white py-3.5 rounded-2xl font-semibold text-[15px] mb-4 disabled:opacity-40 transition-opacity"
      >
        {globalLoading
          ? `Ajout en cours… (${doneCount}/${allIngredients.length})`
          : doneCount === allIngredients.length
          ? '✓ Tout le panier est rempli !'
          : `Tout ajouter au panier Drive (${allIngredients.length} articles)`
        }
      </button>

      {/* Ingredient list */}
      <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        {allIngredients.map((item, i) => {
          const status = itemStatus[item.key] || 'idle';
          return (
            <div
              key={item.key}
              className={`flex items-center gap-3 px-4 py-3 ${
                i < allIngredients.length - 1 ? 'border-b border-[#f2f2f7]' : ''
              } ${status === 'done' ? 'opacity-50' : ''}`}
            >
              {/* Status icon */}
              <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                status === 'done'
                  ? 'bg-green-500 text-white'
                  : status === 'error'
                  ? 'bg-red-100 text-red-500'
                  : status === 'loading'
                  ? 'bg-orange-100'
                  : 'bg-[#f2f2f7]'
              }`}>
                {status === 'done' && '✓'}
                {status === 'error' && '!'}
                {status === 'loading' && (
                  <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm text-[#1c1c1e] ${status === 'done' ? 'line-through' : ''}`}>
                  {item.text}
                </p>
                {item.count !== 1 && (
                  <p className="text-xs text-[#8e8e93]">×{Math.round(item.count * 10) / 10}</p>
                )}
              </div>

              {status !== 'done' && (
                <button
                  onClick={() => addItem(item)}
                  disabled={status === 'loading'}
                  className="shrink-0 text-xs bg-[#f2f2f7] text-orange-500 font-semibold px-3 py-1.5 rounded-full disabled:opacity-40"
                >
                  {status === 'error' ? 'Retry' : '+ Ajouter'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-[#8e8e93] text-center mt-4">
        Les articles sont recherchés par nom dans le catalogue Drive de votre magasin.
      </p>
    </div>
  );
}
