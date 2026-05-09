const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;
const MEAL_PLANS_DB_ID = process.env.NOTION_MEAL_PLANS_DB_ID;
const DAYS_DB_ID = process.env.NOTION_DAYS_DB_ID;

function richTextToString(arr) {
  if (!arr || !Array.isArray(arr)) return '';
  return arr.map((t) => t.plain_text).join('');
}

function toRichText(text) {
  if (!text) return [];
  const chunks = [];
  for (let i = 0; i < text.length; i += 1999) {
    chunks.push({ text: { content: text.slice(i, i + 1999) } });
  }
  return chunks.slice(0, 100);
}

function pageToRecipe(page) {
  const props = page.properties;
  return {
    id: page.id,
    name: richTextToString(props.Name?.title) || 'Sans titre',
    ingredients: richTextToString(props.Ingredients?.rich_text),
    instructions: richTextToString(props.Instructions?.rich_text),
    prepTime: props.PrepTime?.number ?? null,
    cookTime: props.CookTime?.number ?? null,
    servings: props.Servings?.number ?? 1,
    tags: props.Tags?.multi_select?.map((t) => t.name) ?? [],
    category: props.Category?.select?.name ?? 'Autre',
    batchFriendly: props.BatchFriendly?.checkbox ?? false,
    storageDays: props.StorageDays?.number ?? null,
    storageMethod: props.StorageMethod?.select?.name ?? null,
    babyAdaptation: richTextToString(props.BabyAdaptation?.rich_text),
    imageUrl: page.cover?.external?.url || page.cover?.file?.url || null,
    notionUrl: page.url,
    createdAt: page.created_time,
  };
}

async function getAllRecipes() {
  const recipes = [];
  let hasMore = true;
  let startCursor = undefined;
  while (hasMore) {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      start_cursor: startCursor,
      page_size: 100,
      sorts: [{ property: 'Name', direction: 'ascending' }],
    });
    recipes.push(...response.results.map(pageToRecipe));
    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }
  return recipes;
}

async function getRecipeById(pageId) {
  const page = await notion.pages.retrieve({ page_id: pageId });
  return pageToRecipe(page);
}

async function createRecipe(recipe) {
  const props = {
    Name: { title: [{ text: { content: recipe.name } }] },
    Ingredients: { rich_text: [{ text: { content: recipe.ingredients || '' } }] },
    Instructions: { rich_text: [{ text: { content: recipe.instructions || '' } }] },
    Servings: { number: recipe.servings || 1 },
    BatchFriendly: { checkbox: recipe.batchFriendly || false },
  };
  if (recipe.prepTime) props.PrepTime = { number: recipe.prepTime };
  if (recipe.cookTime) props.CookTime = { number: recipe.cookTime };
  if (recipe.tags?.length) props.Tags = { multi_select: recipe.tags.map((t) => ({ name: t })) };
  if (recipe.category) props.Category = { select: { name: recipe.category } };
  if (recipe.storageDays) props.StorageDays = { number: recipe.storageDays };
  if (recipe.storageMethod) props.StorageMethod = { select: { name: recipe.storageMethod } };
  if (recipe.babyAdaptation) props.BabyAdaptation = { rich_text: [{ text: { content: recipe.babyAdaptation } }] };

  const response = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: props,
  });
  return pageToRecipe(response);
}

async function searchRecipes(query) {
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: { property: 'Name', title: { contains: query } },
    page_size: 20,
  });
  return response.results.map(pageToRecipe);
}

// Find a recipe by exact name, or create a stub if not found
async function findOrCreateRecipeByName(name, description, prepTime, cookTime) {
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: { property: 'Name', title: { equals: name } },
    page_size: 1,
  });

  if (response.results.length > 0) {
    return response.results[0].id;
  }

  const props = {
    Name: { title: [{ text: { content: name } }] },
    BatchFriendly: { checkbox: true },
    Servings: { number: 1 },
  };
  if (description) props.Instructions = { rich_text: toRichText(description) };
  if (prepTime) props.PrepTime = { number: prepTime };
  if (cookTime) props.CookTime = { number: cookTime };

  const page = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: props,
  });
  return page.id;
}

async function saveMealPlan({ plan, startDate, endDate, peopleCount, preferences = '' }) {
  if (!MEAL_PLANS_DB_ID || !DAYS_DB_ID) {
    throw new Error('NOTION_MEAL_PLANS_DB_ID ou NOTION_DAYS_DB_ID manquant dans .env');
  }

  // 1. Collect unique meals and find/create their recipe pages
  const allMeals = plan.days.flatMap((d) => [
    d.lunch ? { name: d.lunch.name, description: d.lunch.description, prepTime: d.lunch.prepTime, cookTime: d.lunch.cookTime } : null,
    d.dinner ? { name: d.dinner.name, description: d.dinner.description, prepTime: d.dinner.prepTime, cookTime: d.dinner.cookTime } : null,
  ]).filter(Boolean);

  const uniqueMeals = [...new Map(allMeals.map((m) => [m.name, m])).values()];

  const recipeMap = {};
  for (const meal of uniqueMeals) {
    recipeMap[meal.name] = await findOrCreateRecipeByName(
      meal.name, meal.description, meal.prepTime, meal.cookTime
    );
  }

  // 2. Format text fields
  const batchText = plan.batchSessions?.map((s) =>
    `${s.dayLabel}${s.label && s.label !== s.dayLabel ? ' — ' + s.label : ''}\n` +
    s.tasks.map((t) => `• ${t}`).join('\n')
  ).join('\n\n') || '';

  const coursesText = plan.shoppingList?.map((item) =>
    `• ${item.name} — ${item.quantity} (${item.category})`
  ).join('\n') || '';

  // 3. Plan name
  const fmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const planName = `Plan du ${fmt(startDate)} au ${fmt(endDate)}`;

  // 4. Create the Plan de repas page
  const planProps = {
    Nom: { title: [{ text: { content: planName } }] },
    'DateDébut': { date: { start: startDate } },
    DateFin: { date: { start: endDate } },
    Personnes: { number: peopleCount },
  };
  if (preferences) planProps['Préférences'] = { rich_text: toRichText(preferences) };
  if (batchText) planProps.SessionsBatch = { rich_text: toRichText(batchText) };
  if (coursesText) planProps.ListeCourses = { rich_text: toRichText(coursesText) };

  const planPage = await notion.pages.create({
    parent: { database_id: MEAL_PLANS_DB_ID },
    properties: planProps,
  });

  // 5. Create one Jour du plan page per day
  for (const day of plan.days) {
    const lunchId = day.lunch?.name ? recipeMap[day.lunch.name] : null;
    const dinnerId = day.dinner?.name ? recipeMap[day.dinner.name] : null;

    const dayProps = {
      Nom: { title: [{ text: { content: day.dayLabel } }] },
      Date: { date: { start: day.date } },
      Plan: { relation: [{ id: planPage.id }] },
    };
    if (lunchId) dayProps.Midi = { relation: [{ id: lunchId }] };
    if (dinnerId) dayProps.Soir = { relation: [{ id: dinnerId }] };

    await notion.pages.create({
      parent: { database_id: DAYS_DB_ID },
      properties: dayProps,
    });
  }

  return { id: planPage.id, url: planPage.url, name: planName };
}

module.exports = { getAllRecipes, getRecipeById, createRecipe, searchRecipes, saveMealPlan };
