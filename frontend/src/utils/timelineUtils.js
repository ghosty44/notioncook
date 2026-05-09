export function buildTimeline(entries) {
  if (!entries.length) return [];

  const steps = entries.map((entry) => ({
    id: entry.recipe.id,
    name: entry.recipe.name,
    prepTime: entry.recipe.prepTime || 0,
    cookTime: entry.recipe.cookTime || 0,
    totalTime: (entry.recipe.prepTime || 0) + (entry.recipe.cookTime || 0),
    category: entry.recipe.category,
    servings: entry.servings,
    parallel: false,
  }));

  // Sort: passive cooking tasks first (high cookTime ratio), then by total time
  steps.sort((a, b) => {
    const aPassive = a.cookTime / (a.totalTime || 1);
    const bPassive = b.cookTime / (b.totalTime || 1);
    if (Math.abs(aPassive - bPassive) > 0.3) return bPassive - aPassive;
    return b.totalTime - a.totalTime;
  });

  // Mark steps parallelizable with previous high-cookTime tasks
  let hasActiveCooking = false;
  steps.forEach((step, i) => {
    if (i === 0) { hasActiveCooking = step.cookTime > 0; return; }
    if (step.cookTime > 10 && step.prepTime < 15 && hasActiveCooking) {
      step.parallel = true;
    }
    if (step.cookTime > 0) hasActiveCooking = true;
  });

  return steps;
}
