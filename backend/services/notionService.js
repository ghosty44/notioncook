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
    notes: richTextToString(props.Notes?.rich_text),
    favori: props.Favori?.checkbox ?? false,
    dejaFait: props['DéjàFait']?.checkbox ?? false,
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
  if (recipe.babyAdaptation) props.BabyAdaptation = { rich_text: toRichText(recipe.babyAdaptation) };
  if (recipe.notes) props.Notes = { rich_text: toRichText(recipe.notes) };
  if (recipe.favori) props.Favori = { checkbox: true };
  if (recipe.dejaFait) props['DéjàFait'] = { checkbox: true };

  const response = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: props,
  });
  return pageToRecipe(response);
}

async function updateRecipe(id, fields) {
  const props = {};
  if (fields.notes !== undefined) props.Notes = { rich_text: toRichText(fields.notes) };
  if (fields.favori !== undefined) props.Favori = { checkbox: Boolean(fields.favori) };
  if (fields.dejaFait !== undefined) props['DéjàFait'] = { checkbox: Boolean(fields.dejaFait) };
  const page = await notion.pages.update({ page_id: id, properties: props });
  return pageToRecipe(page);
}

async function searchRecipes(query) {
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: { property: 'Name', title: { contains: query } },
    page_size: 20,
  });
  return response.results.map(pageToRecipe);
}

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

async function findPlanByDates(startDate, endDate) {
  const response = await notion.databases.query({
    database_id: MEAL_PLANS_DB_ID,
    filter: {
      and: [
        { property: 'DateDébut', date: { equals: startDate } },
        { property: 'DateFin', date: { equals: endDate } },
      ],
    },
    page_size: 1,
  });
  return response.results[0] || null;
}

async function findOverlappingPlans(startDate, endDate) {
  const response = await notion.databases.query({
    database_id: MEAL_PLANS_DB_ID,
    filter: {
      and: [
        { property: 'DateDébut', date: { on_or_before: endDate } },
        { property: 'DateFin', date: { on_or_after: startDate } },
      ],
    },
    page_size: 10,
  });
  return response.results.filter((p) => {
    const pStart = p.properties['DateDébut']?.date?.start;
    const pEnd = p.properties.DateFin?.date?.start;
    return !(pStart === startDate && pEnd === endDate);
  });
}

async function findDayPage(planId, date) {
  const response = await notion.databases.query({
    database_id: DAYS_DB_ID,
    filter: {
      and: [
        { property: 'Plan', relation: { contains: planId } },
        { property: 'Date', date: { equals: date } },
      ],
    },
    page_size: 1,
  });
  return response.results[0] || null;
}

async function getMealPlans() {
  if (!MEAL_PLANS_DB_ID) return [];
  const response = await notion.databases.query({
    database_id: MEAL_PLANS_DB_ID,
    sorts: [{ property: 'DateDébut', direction: 'descending' }],
    page_size: 10,
  });
  return response.results.map((page) => {
    const props = page.properties;
    return {
      id: page.id,
      name: richTextToString(props.Nom?.title) || 'Sans titre',
      url: page.url,
      startDate: props['DateDébut']?.date?.start || null,
      endDate: props.DateFin?.date?.start || null,
      peopleCount: props.Personnes?.number ?? null,
    };
  });
}

async function getMealPlanById(planId) {
  const response = await notion.blocks.children.list({ block_id: planId, page_size: 50 });
  const codeBlock = response.results.find((b) => b.type === 'code');
  if (!codeBlock) throw new Error('Aucun JSON stocké pour ce plan');
  const jsonText = codeBlock.code.rich_text.map((t) => t.plain_text).join('');
  return JSON.parse(jsonText);
}

async function deleteRecipe(pageId) {
  await notion.pages.update({ page_id: pageId, archived: true });
}

async function deleteMealPlan(planId) {
  if (DAYS_DB_ID) {
    let hasMore = true;
    let startCursor = undefined;
    while (hasMore) {
      const response = await notion.databases.query({
        database_id: DAYS_DB_ID,
        filter: { property: 'Plan', relation: { contains: planId } },
        start_cursor: startCursor,
        page_size: 100,
      });
      for (const day of response.results) {
        await notion.pages.update({ page_id: day.id, archived: true });
      }
      hasMore = response.has_more;
      startCursor = response.next_cursor;
    }
  }
  await notion.pages.update({ page_id: planId, archived: true });
}

async function saveMealPlan({ plan, startDate, endDate, peopleCount, preferences = '' }) {
  if (!MEAL_PLANS_DB_ID || !DAYS_DB_ID) {
    throw new Error('NOTION_MEAL_PLANS_DB_ID ou NOTION_DAYS_DB_ID manquant dans .env');
  }

  const overlaps = await findOverlappingPlans(startDate, endDate);
  if (overlaps.length > 0) {
    const name = richTextToString(overlaps[0].properties.Nom?.title) || 'Plan existant';
    const oStart = overlaps[0].properties['DateDébut']?.date?.start || '';
    const oEnd = overlaps[0].properties.DateFin?.date?.start || '';
    throw new Error(
      `Ces dates chevauchent le plan « ${name} » (${oStart} → ${oEnd}). Supprimez-le d'abord ou choisissez une autre période.`
    );
  }

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

  const batchText = plan.batchSessions?.map((s) =>
    `${s.dayLabel}${s.label && s.label !== s.dayLabel ? ' — ' + s.label : ''}\n` +
    s.tasks.map((t) => `• ${t}`).join('\n')
  ).join('\n\n') || '';

  const coursesText = plan.shoppingList?.map((item) =>
    `• ${item.name} — ${item.quantity} (${item.category})`
  ).join('\n') || '';

  const fmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const planName = `Plan du ${fmt(startDate)} au ${fmt(endDate)}`;

  const planProps = {
    Nom: { title: [{ text: { content: planName } }] },
    'DateDébut': { date: { start: startDate } },
    DateFin: { date: { start: endDate } },
    Personnes: { number: peopleCount },
  };
  if (preferences) planProps['Préférences'] = { rich_text: toRichText(preferences) };
  if (batchText) planProps.SessionsBatch = { rich_text: toRichText(batchText) };
  if (coursesText) planProps.ListeCourses = { rich_text: toRichText(coursesText) };

  let planPageId;
  let planPageUrl;
  const existingPlan = await findPlanByDates(startDate, endDate);
  if (existingPlan) {
    planPageId = existingPlan.id;
    planPageUrl = existingPlan.url;
    await notion.pages.update({ page_id: planPageId, properties: planProps });
    const blocks = await notion.blocks.children.list({ block_id: planPageId, page_size: 50 });
    for (const block of blocks.results.filter((b) => b.type === 'code')) {
      await notion.blocks.delete({ block_id: block.id });
    }
  } else {
    const planPage = await notion.pages.create({
      parent: { database_id: MEAL_PLANS_DB_ID },
      properties: planProps,
    });
    planPageId = planPage.id;
    planPageUrl = planPage.url;
  }

  await notion.blocks.children.append({
    block_id: planPageId,
    children: [{ type: 'code', code: { language: 'json', rich_text: toRichText(JSON.stringify(plan)) } }],
  });

  for (const day of plan.days) {
    const lunchId = day.lunch?.name ? recipeMap[day.lunch.name] : null;
    const dinnerId = day.dinner?.name ? recipeMap[day.dinner.name] : null;

    const dayProps = {
      Nom: { title: [{ text: { content: day.dayLabel } }] },
      Date: { date: { start: day.date } },
      Plan: { relation: [{ id: planPageId }] },
    };
    if (lunchId) dayProps.Midi = { relation: [{ id: lunchId }] };
    if (dinnerId) dayProps.Soir = { relation: [{ id: dinnerId }] };

    const existingDay = await findDayPage(planPageId, day.date);
    if (existingDay) {
      await notion.pages.update({ page_id: existingDay.id, properties: dayProps });
    } else {
      await notion.pages.create({ parent: { database_id: DAYS_DB_ID }, properties: dayProps });
    }
  }

  return { id: planPageId, url: planPageUrl, name: planName };
}

function pageToCartItem(page) {
  const props = page.properties;
  return {
    id: page.id,
    text: richTextToString(props.Nom?.title),
    category: props.Catégorie?.select?.name || 'Divers',
  };
}

async function getCartItems() {
  const response = await notion.databases.query({
    database_id: process.env.NOTION_CART_DATABASE_ID,
    sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
  });
  return response.results.map(pageToCartItem);
}

async function addCartItem(item) {
  const props = { Nom: { title: [{ text: { content: item.text } }] } };
  if (item.category) props.Catégorie = { select: { name: item.category } };
  const page = await notion.pages.create({
    parent: { database_id: process.env.NOTION_CART_DATABASE_ID },
    properties: props,
  });
  return pageToCartItem(page);
}

async function removeCartItem(id) {
  await notion.pages.update({ page_id: id, archived: true });
}

async function clearCart() {
  const items = await getCartItems();
  await Promise.all(items.map((i) => removeCartItem(i.id)));
}

module.exports = {
  getAllRecipes, getRecipeById, createRecipe, updateRecipe, searchRecipes,
  saveMealPlan, getMealPlans, getMealPlanById,
  deleteRecipe, deleteMealPlan,
  getCartItems, addCartItem, removeCartItem, clearCart,
};
