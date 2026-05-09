# 🥗 BatchCook — App de Batch Cooking

Application web complète de batch cooking : planifiez vos sessions de cuisine en grande quantité, générez vos listes de courses, organisez l'ordre de préparation et obtenez des suggestions IA.

Connectée à **Notion** (recettes) et **Google Gemini** (suggestions IA).

## Fonctionnalités

| Onglet | Description |
|---|---|
| 📚 **Bibliothèque** | Parcourir et rechercher vos recettes Notion, filtrer par batch-friendly |
| 🥘 **Batch Planner** | Sélectionner les recettes + ajuster les portions pour la session |
| 🛒 **Liste de courses** | Générée automatiquement, regroupée par catégorie, cochable, copiable |
| ⏱ **Timeline** | Ordre de préparation optimisé + minuteurs interactifs par recette |
| ✨ **Suggestions IA** | Recettes adaptées au batch cooking générées par Gemini |

---

## Structure du projet

```
batchcook/
├── backend/                  # API Express (Node.js)
│   ├── server.js
│   ├── routes/
│   │   ├── notion.js         # CRUD recettes Notion (avec champs batch)
│   │   ├── gemini.js         # Génération recettes batch cooking
│   │   └── session.js        # Session batch (in-memory)
│   ├── services/
│   │   ├── notionService.js  # Client Notion API
│   │   └── geminiService.js  # Client Gemini API
│   ├── .env.example
│   └── package.json
│
└── frontend/                 # React + Vite + Tailwind
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── Navigation.jsx
    │   │   ├── RecipeLibrary.jsx     # Grille de recettes avec filtres
    │   │   ├── RecipeModal.jsx       # Détail d'une recette
    │   │   ├── BatchPlanner.jsx      # Sélection recettes + portions
    │   │   ├── ShoppingList.jsx      # Liste de courses agregée
    │   │   ├── CookingTimeline.jsx   # Ordre de prép + minuteurs
    │   │   └── AISuggestions.jsx     # Générateur Gemini
    │   ├── hooks/
    │   │   ├── useRecipes.js
    │   │   └── useBatch.js
    │   ├── store/
    │   │   └── batchStore.js         # Zustand (persist localStorage)
    │   └── utils/
    │       ├── api.js
    │       ├── shoppingListUtils.js
    │       └── timelineUtils.js
    └── package.json
```

---

## Pré-requis

- **Node.js** ≥ 18
- Un compte **Notion** avec une base de données de recettes
- Une clé API **Google Gemini** (Google AI Studio)

---

## 1. Base de données Notion

Créez (ou adaptez) une base de données Notion avec ces propriétés :

| Propriété | Type Notion |
|---|---|
| `Name` | **Title** |
| `Ingredients` | Rich Text |
| `Instructions` | Rich Text |
| `PrepTime` | Number (minutes) |
| `CookTime` | Number (minutes) |
| `Servings` | Number |
| `Tags` | Multi-select |
| `Category` | Select (`Déjeuner`, `Dîner`, `Petit-déjeuner`, `Snack`, `Dessert`, `Soupe`, `Salade`, `Autre`) |
| `BatchFriendly` | **Checkbox** — se conserve bien, adapté au batch |
| `StorageDays` | Number — jours de conservation |
| `StorageMethod` | Select — `Frigo` / `Congélateur` / `Température ambiante` |

---

## 2. Installation

### Backend

```bash
cd backend
cp .env.example .env
# Éditez .env avec vos clés
npm install
npm run dev
# → http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 3. Variables d'environnement (backend)

| Variable | Description |
|---|---|
| `NOTION_API_KEY` | Clé secrète de votre intégration Notion |
| `NOTION_DATABASE_ID` | ID de votre base de données Notion |
| `GEMINI_API_KEY` | Clé API Google Gemini |
| `PORT` | Port du serveur (défaut : 3001) |
| `FRONTEND_URL` | URL du frontend pour CORS (défaut : http://localhost:5173) |

---

## 4. Utilisation

### Bibliothèque
- Parcourez vos recettes Notion
- Filtrez par catégorie ou cochez "Batch-friendly uniquement"
- Cliquez sur une carte pour voir les détails
- Cliquez **+ Ajouter au batch** pour l'ajouter à votre session

### Batch Planner
- Visualisez toutes les recettes de la session
- Ajustez les portions pour chaque recette (2 à 12 portions)
- Consultez le récapitulatif (temps total, nombre de portions)

### Liste de courses
- Générée automatiquement depuis les recettes de la session
- Les ingrédients sont agrégés et multipliés selon les portions
- Cochez les articles au fur et à mesure
- Copiez ou imprimez la liste

### Timeline de cuisson
- Ordre optimisé : les recettes à cuisson passive (four, mijotage) sont lancées en premier
- Les tâches parallélisables sont identifiées
- Minuteurs interactifs avec pause/reprise/réinitialisation

### Suggestions IA
- Utilisez les prompts rapides ou décrivez vos préférences
- Choisissez le nombre de suggestions (1–4)
- Ajoutez directement au batch planner ou sauvegardez dans Notion

---

## Architecture

- **Session batch** : persistée en `localStorage` via Zustand `persist`
- **Notion** : toutes les requêtes passent par le backend (clés jamais exposées côté client)
- **Gemini** : prompt structuré JSON orienté batch cooking (conservation, quantités, réchauffage)
- **Timeline** : tri par ratio cuisson/préparation pour maximiser l'efficacité de la session
