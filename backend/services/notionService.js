const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

// Extracts plain text from a Notion rich_text array
function richTextToString(richTextArr) {
  if (!richTextArr || !Array.isArray(richTextArr)) return '';
  return richTextArr.map((t) => t.plain_text).join('');
}

// Converts a raw Notion page object into a clean recipe object
function pageToRecipe(page) {
  const props = page.properties;
  return {
    id: page.id,
    name: richTextToString(props.Name?.title) || 'Sans titre',
    ingredients: richTextToString(props.Ingredients?.rich_text),
    instructions: richTextToString(props.Instructions?.rich_text),
    prepTime: props.PrepTime?.number ?? null,
    cookTime: props.CookTime?.number ?? null,
    servings: props.Servings?.number ?? 2,
    tags: props.Tags?.multi_select?.map((t) => t.name) ?? [],
    category: props.Category?.select?.name ?? 'Autre',
    babyAdaptation: richTextToString(props.BabyAdaptation?.rich_text),
    imageUrl: page.cover?.external?.url || page.cover?.file?.url || null,
    notionUrl: page.url,
    createdAt: page.created_time,
  };
}

async function getAllRecipes(cursor = undefined) {
  const recipes = [];
  let hasMore = true;
  let startCursor = cursor;

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
  const response = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      Name: { title: [{ text: { content: recipe.name } }] },
      Ingredients: { rich_text: [{ text: { content: recipe.ingredients || '' } }] },
      Instructions: { rich_text: [{ text: { content: recipe.instructions || '' } }] },
      PrepTime: recipe.prepTime ? { number: recipe.prepTime } : undefined,
      CookTime: recipe.cookTime ? { number: recipe.cookTime } : undefined,
      Servings: recipe.servings ? { number: recipe.servings } : undefined,
      Tags: recipe.tags?.length
        ? { multi_select: recipe.tags.map((tag) => ({ name: tag })) }
        : undefined,
      Category: recipe.category ? { select: { name: recipe.category } } : undefined,
      BabyAdaptation: recipe.babyAdaptation
        ? { rich_text: [{ text: { content: recipe.babyAdaptation } }] }
        : undefined,
    },
  });

  return pageToRecipe(response);
}

async function searchRecipes(query) {
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      property: 'Name',
      title: { contains: query },
    },
    page_size: 20,
  });

  return response.results.map(pageToRecipe);
}

module.exports = { getAllRecipes, getRecipeById, createRecipe, searchRecipes };
