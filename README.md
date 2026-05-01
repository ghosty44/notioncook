# 🍽️ NotionCook — Recettes & Planning de repas

Application web complète de gestion de recettes et de planification de repas, connectée à **Notion** et **Google Gemini**.

## Fonctionnalités

| Module | Description |
|---|---|
| 📚 **Mes recettes** | Lecture et recherche de vos recettes Notion |
| ✨ **Suggestions IA** | Génération de nouvelles recettes via Gemini, avec adaptation bébé |
| 📅 **Planning** | Agenda hebdomadaire avec drag & drop, indicateur bébé par repas |
| 🛒 **Liste de courses** | Générée automatiquement, regroupée par catégorie, cochable, exportable |

---

## Structure du projet

```
notioncook/
├── backend/                  # API Express (Node.js)
│   ├── server.js
│   ├── routes/
│   │   ├── notion.js         # CRUD recettes Notion
│   │   ├── gemini.js         # Génération de suggestions IA
│   │   └── meals.js          # Planning (in-memory)
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
    │   │   ├── RecipeList.jsx
    │   │   ├── RecipeCard.jsx
    │   │   ├── RecipeModal.jsx
    │   │   ├── MealPlanner.jsx       # Calendrier avec DnD
    │   │   ├── MealSlot.jsx          # Cellule droppable/draggable
    │   │   ├── RecipePickerModal.jsx # Sélecteur de recette
    │   │   ├── GeminiSuggestions.jsx
    │   │   └── ShoppingList.jsx
    │   ├── hooks/
    │   │   ├── useRecipes.js
    │   │   └── useGemini.js
    │   ├── store/
    │   │   └── mealPlanStore.js      # Zustand (persist localStorage)
    │   └── utils/
    │       ├── api.js
    │       ├── dateUtils.js
    │       └── shoppingListUtils.js
    ├── tailwind.config.js
    ├── vite.config.js
    └── package.json
```

---

## Pré-requis

- **Node.js** ≥ 18
- Un compte **Notion** avec une base de données de recettes
- Une clé API **Google Gemini** (Google AI Studio)

---

## 1. Préparer la base de données Notion

Créez une base de données Notion avec les propriétés suivantes (les types sont importants) :

| Propriété | Type Notion |
|---|---|
| `Name` | **Title** |
| `Ingredients` | Rich Text |
| `Instructions` | Rich Text |
| `PrepTime` | Number (minutes) |
| `CookTime` | Number (minutes) |
| `Servings` | Number |
| `Tags` | Multi-select |
| `Category` | Select (`Petit-déjeuner`, `Déjeuner`, `Dîner`, `Snack`, `Dessert`, `Autre`) |
| `BabyAdaptation` | Rich Text |

Puis :
1. Allez sur [notion.so/my-integrations](https://www.notion.so/my-integrations) → créez une intégration
2. Copiez la **clé secrète** (`secret_xxx…`)
3. Ouvrez votre base de recettes → **…** → **Connections** → ajoutez votre intégration
4. Copiez l'**ID de la base** depuis l'URL : `notion.so/{workspace}/{DATABASE_ID}?v=…`

---

## 2. Obtenir une clé Gemini

1. Allez sur [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Cliquez **Create API key**
3. Copiez la clé (`AIzaSy…`)

---

## 3. Installation

### Backend

```bash
cd backend
cp .env.example .env
# Éditez .env avec vos clés :
#   NOTION_API_KEY=secret_xxx
#   NOTION_DATABASE_ID=xxx
#   GEMINI_API_KEY=AIzaSy...
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

## 4. Utilisation

### Planning de repas
- Naviguez entre les semaines avec **←** / **→**
- Cliquez **+** dans un créneau pour choisir une recette depuis votre bibliothèque
- **Glissez-déposez** une recette d'un créneau à un autre
- Cliquez l'icône 👶 sur un repas pour activer l'adaptation bébé

### Suggestions IA
- Entrez des préférences (ex: "végétarien", "rapide", "sans gluten")
- Choisissez un type de repas et le nombre de suggestions
- Cliquez **Voir la recette** pour le détail complet
- Cliquez **💾 Notion** pour sauvegarder directement dans votre base

### Liste de courses
- Sélectionnez une période de dates
- La liste est générée depuis les repas planifiés
- Cochez les articles au fur et à mesure
- Utilisez **Copier** ou **Imprimer** pour exporter

---

## Variables d'environnement (backend)

| Variable | Description |
|---|---|
| `NOTION_API_KEY` | Clé secrète de votre intégration Notion |
| `NOTION_DATABASE_ID` | ID de votre base de données Notion |
| `GEMINI_API_KEY` | Clé API Google Gemini |
| `PORT` | Port du serveur (défaut : 3001) |
| `FRONTEND_URL` | URL du frontend pour CORS (défaut : http://localhost:5173) |

---

## Développement

```bash
# Backend avec hot-reload
cd backend && npm run dev

# Frontend avec HMR
cd frontend && npm run dev

# Build de production
cd frontend && npm run build
```

Le frontend proxifie automatiquement les requêtes `/api/*` vers le backend (configuré dans `vite.config.js`).

---

## Architecture

- **État du planning** : persisté en `localStorage` via Zustand `persist` middleware — pas besoin de base de données pour le MVP
- **Drag & drop** : `@dnd-kit/core` avec `PointerSensor` (fonctionne souris + tactile)
- **Notion** : toutes les requêtes passent par le backend (les clés ne sont jamais exposées côté client)
- **Gemini** : prompt structuré JSON pour garantir un format cohérent des recettes générées
