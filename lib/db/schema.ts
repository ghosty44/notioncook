import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * L'ordre de cet enum est l'ordre de parcours du drive : la liste de courses
 * est triée dessus. Ne jamais réordonner sans migration explicite.
 */
export const aisle = pgEnum('aisle', [
  'fruits_legumes',
  'boucherie',
  'poissonnerie',
  'cremerie',
  'charcuterie_traiteur',
  'epicerie_salee',
  'epicerie_sucree',
  'boulangerie',
  'surgeles',
  'boissons',
  'bebe',
  'entretien',
  'hygiene',
  'autre',
]);

export const mealKind = pgEnum('meal_kind', ['recipe', 'combo', 'leftover_base']);
export const mealEffort = pgEnum('meal_effort', ['express', 'standard', 'projet']);
export const mealSlot = pgEnum('meal_slot', ['midi', 'soir']);
export const listStatus = pgEnum('list_status', ['draft', 'ordered']);
export const listItemSource = pgEnum('list_item_source', ['plan', 'manual', 'recurring']);
export const avoidanceScope = pgEnum('avoidance_scope', ['brand', 'ingredient', 'product']);
export const avoidanceReason = pgEnum('avoidance_reason', [
  'allergie',
  'gout',
  'prix',
  'composition',
  'autre',
]);
export const candidateConfidence = pgEnum('candidate_confidence', ['high', 'medium', 'low']);
export const candidateStatus = pgEnum('candidate_status', ['pending', 'accepted', 'rejected']);

const now = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

// --- Foyer et utilisateurs -------------------------------------------------

export const households = pgTable('household', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  /** Code court partagé entre les adultes du foyer pour rejoindre. */
  inviteCode: text('invite_code').notNull().unique(),
  /** Empreinte du jeton MCP du foyer (phase 2). Le jeton clair n'est jamais stocké. */
  mcpTokenHash: text('mcp_token_hash').unique(),
  mcpTokenCreatedAt: timestamp('mcp_token_created_at', { withTimezone: true }),
  /** Contraintes du foyer en texte libre, exposées au MCP (section 10.1). */
  constraints: text('constraints'),
  createdAt: now(),
});

export const users = pgTable(
  'user',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    name: text('name').notNull(),
    createdAt: now(),
  },
  (t) => [uniqueIndex('user_household_email_idx').on(t.householdId, t.email)],
);

// --- Repas -----------------------------------------------------------------

export const meals = pgTable(
  'meal',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** Clé de rapprochement : nom normalisé, sert à ne pas créer de doublon. */
    slug: text('slug').notNull(),
    kind: mealKind('kind').notNull().default('combo'),
    effort: mealEffort('effort').notNull().default('standard'),
    steps: text('steps'),
    notes: text('notes'),
    /** Ce qu'on prélève ou adapte pour l'enfant. Champ mis en avant dans l'UI. */
    babyNote: text('baby_note'),
    tags: text('tags').array().notNull().default([]),
    season: text('season').array().notNull().default([]),
    sourceUrl: text('source_url'),
    rating: integer('rating'),
    isArchived: boolean('is_archived').notNull().default(false),
    createdAt: now(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('meal_household_slug_idx').on(t.householdId, t.slug)],
);

export const ingredients = pgTable(
  'ingredient',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    aisle: aisle('aisle').notNull().default('autre'),
    defaultUnit: text('default_unit'),
    createdAt: now(),
  },
  (t) => [uniqueIndex('ingredient_household_slug_idx').on(t.householdId, t.slug)],
);

export const mealIngredients = pgTable('meal_ingredient', {
  id: uuid('id').primaryKey().defaultRandom(),
  mealId: uuid('meal_id')
    .notNull()
    .references(() => meals.id, { onDelete: 'cascade' }),
  ingredientId: uuid('ingredient_id').references(() => ingredients.id, {
    onDelete: 'set null',
  }),
  quantity: numeric('quantity'),
  unit: text('unit'),
  /** Ingrédient qu'on a toujours : exclu de la liste de courses. */
  isPantryStaple: boolean('is_pantry_staple').notNull().default(false),
  freeText: text('free_text'),
  position: integer('position').notNull().default(0),
});

/** Journal de ce qui a réellement été mangé. Seule source des suggestions. */
export const mealLogs = pgTable('meal_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  mealId: uuid('meal_id')
    .notNull()
    .references(() => meals.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  slot: mealSlot('slot').notNull().default('soir'),
  likedByBaby: boolean('liked_by_baby'),
  comment: text('comment'),
  createdAt: now(),
});

export const planEntries = pgTable(
  'plan_entry',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    slot: mealSlot('slot').notNull(),
    mealId: uuid('meal_id').references(() => meals.id, {
      onDelete: 'set null',
    }),
    freeText: text('free_text'),
  },
  (t) => [uniqueIndex('plan_entry_slot_idx').on(t.householdId, t.date, t.slot)],
);

// --- Enseignes et produits -------------------------------------------------

export const stores = pgTable('store', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  baseUrl: text('base_url'),
  houseBrands: text('house_brands').array().notNull().default([]),
  pickupHours: text('pickup_hours'),
  address: text('address'),
  createdAt: now(),
});

/** Table la plus importante : ingrédient canonique vers référence réelle du drive. */
export const products = pgTable('product', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  ingredientId: uuid('ingredient_id')
    .notNull()
    .references(() => ingredients.id, { onDelete: 'cascade' }),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  brand: text('brand'),
  format: text('format'),
  externalId: text('external_id'),
  productUrl: text('product_url'),
  lastPrice: numeric('last_price'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  isPreferred: boolean('is_preferred').notNull().default(false),
  isUnavailable: boolean('is_unavailable').notNull().default(false),
  note: text('note'),
  createdAt: now(),
});

export const rejectedProducts = pgTable('rejected_product', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  ingredientId: uuid('ingredient_id').references(() => ingredients.id, {
    onDelete: 'cascade',
  }),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  reason: text('reason'),
  createdAt: now(),
});

export const storeRules = pgTable('store_rule', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  priority: integer('priority').notNull().default(0),
  rule: text('rule').notNull(),
});

export const brandPreferences = pgTable('brand_preference', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  storeId: uuid('store_id').references(() => stores.id, {
    onDelete: 'cascade',
  }),
  aisle: aisle('aisle'),
  ingredientId: uuid('ingredient_id').references(() => ingredients.id, {
    onDelete: 'cascade',
  }),
  brand: text('brand').notNull(),
  priority: integer('priority').notNull().default(0),
});

export const avoidances = pgTable('avoidance', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  scope: avoidanceScope('scope').notNull(),
  value: text('value').notNull(),
  reason: avoidanceReason('reason').notNull().default('autre'),
  /** Bloquant : ne doit jamais être contourné, typiquement une allergie. */
  isHard: boolean('is_hard').notNull().default(false),
});

// --- Courses ---------------------------------------------------------------

export const shoppingLists = pgTable('shopping_list', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  storeId: uuid('store_id').references(() => stores.id, {
    onDelete: 'set null',
  }),
  status: listStatus('status').notNull().default('draft'),
  notes: text('notes'),
  createdAt: now(),
  orderedAt: timestamp('ordered_at', { withTimezone: true }),
});

export const shoppingListItems = pgTable('shopping_list_item', {
  id: uuid('id').primaryKey().defaultRandom(),
  listId: uuid('list_id')
    .notNull()
    .references(() => shoppingLists.id, { onDelete: 'cascade' }),
  ingredientId: uuid('ingredient_id').references(() => ingredients.id, {
    onDelete: 'set null',
  }),
  productId: uuid('product_id').references(() => products.id, {
    onDelete: 'set null',
  }),
  label: text('label').notNull(),
  quantity: numeric('quantity'),
  unit: text('unit'),
  aisle: aisle('aisle').notNull().default('autre'),
  isChecked: boolean('is_checked').notNull().default(false),
  source: listItemSource('source').notNull().default('manual'),
});

/** Le socle du panier qui ne bouge pas : environ 70 % du panier réel. */
export const recurringItems = pgTable('recurring_item', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  defaultQuantity: numeric('default_quantity'),
  frequencyWeeks: integer('frequency_weeks').notNull().default(1),
  lastAddedAt: timestamp('last_added_at', { withTimezone: true }),
});

// --- Amorçage de la base (section 10.2) ------------------------------------

export const productCandidates = pgTable(
  'product_candidate',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    rawLabel: text('raw_label').notNull(),
    /** Clé de déduplication : external_id sinon raw_label normalisé. */
    dedupeKey: text('dedupe_key').notNull(),
    guessedIngredientName: text('guessed_ingredient_name'),
    guessedIngredientId: uuid('guessed_ingredient_id').references(() => ingredients.id, {
      onDelete: 'set null',
    }),
    brand: text('brand'),
    format: text('format'),
    externalId: text('external_id'),
    price: numeric('price'),
    occurrences: integer('occurrences').notNull().default(1),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    confidence: candidateConfidence('confidence').notNull().default('low'),
    source: text('source'),
    status: candidateStatus('status').notNull().default('pending'),
    batchId: uuid('batch_id'),
  },
  (t) => [uniqueIndex('product_candidate_dedupe_idx').on(t.storeId, t.dedupeKey)],
);
