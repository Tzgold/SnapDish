import OpenAI from 'openai';
import { z } from 'zod';

import { enrichRecipeNutrition, reconcileNutrition } from './nutrition-estimate.js';

const RecipeIngredientSchema = z.object({
  name: z.string(),
  quantity: z.string(),
  optional: z.boolean().optional(),
  calories: z.number().optional(),
  proteinGrams: z.number().optional(),
  matchedFood: z.string().optional(),
  /** 0–1 how confident the model is this ingredient is correct (required when detectedFromPhoto is true) */
  confidence: z.number().min(0).max(1).optional(),
  /** True if visibly identified from the food photo */
  detectedFromPhoto: z.boolean().optional(),
  /** When uncertain, alternate guess e.g. "could be turkey instead of chicken" */
  possibleAlternative: z.string().optional(),
});

export const NutritionRecalcSchema = z.object({
  servings: z.number().int().min(1).max(12).default(1),
  ingredients: z.array(
    z.object({
      name: z.string().min(1),
      quantity: z.string().min(1),
      optional: z.boolean().optional(),
    })
  ),
});

const NutritionMetaSchema = z.object({
  source: z.enum(['usda', 'hybrid', 'estimate']),
  coverage: z.number().optional(),
  matchedIngredients: z.number().optional(),
  totalIngredients: z.number().optional(),
  dataAttribution: z.string().optional(),
  macros: z
    .object({
      proteinGrams: z.number(),
      fatGrams: z.number(),
      carbsGrams: z.number(),
    })
    .optional(),
  breakdown: z.array(z.unknown()).optional(),
});

const RecipeStepSchema = z.object({
  order: z.number().int().min(1),
  instruction: z.string(),
  durationMinutes: z.number().optional(),
});

export const RecipeResultSchema = z.object({
  recipeTitle: z.string(),
  servings: z.number(),
  prepTimeMinutes: z.number(),
  cookTimeMinutes: z.number(),
  totalTimeMinutes: z.number(),
  calories: z.number().optional(),
  caloriesPerServing: z.number().optional(),
  rating: z.number().optional(),
  confidenceScore: z.number(),
  visualAnalysis: z.string().optional(),
  nutrition: NutritionMetaSchema.optional(),
  ingredients: z.array(RecipeIngredientSchema),
  steps: z.array(RecipeStepSchema),
  notes: z.array(z.string()).optional(),
});

export const AnalyzeBodySchema = z
  .object({
    dishName: z.string().optional(),
    recipeDetails: z.string().optional(),
    cookingStyle: z.string().optional(),
    imageBase64: z.string().optional(),
    imageMimeType: z.string().optional(),
  })
  .refine(
    (d) =>
      (typeof d.dishName === 'string' && d.dishName.trim().length > 0) ||
      (typeof d.imageBase64 === 'string' && d.imageBase64.replace(/\s/g, '').length > 0),
    { message: 'Provide a dish name and/or a food photo (base64).' }
  );

const JSON_ONLY_SYSTEM = `You are SnapDish, a precise cooking assistant. Always respond with a single valid JSON object only (no markdown fences, no extra text).
The JSON must match this shape:
{
  "recipeTitle": string,
  "servings": number (integer 1–12),
  "prepTimeMinutes": number (mise en place only — chopping, measuring, marinating before heat),
  "cookTimeMinutes": number (active heat only — boil, sauté, bake, simmer; parallel tasks overlap, do not double-count),
  "totalTimeMinutes": number (must equal prepTimeMinutes + cookTimeMinutes),
  "calories": number optional (rough guess OK — server recalculates from USDA database),
  "caloriesPerServing": number optional,
  "rating": number between 1 and 5,
  "confidenceScore": number between 0 and 1,
  "visualAnalysis": string (photo path only: 2–4 sentences describing what you see — dish type, visible ingredients, colors, textures, portion size),
  "ingredients": [{
    "name": string,
    "quantity": string with weight/volume (e.g. "200 g", "2 tbsp"),
    "optional": boolean optional,
    "confidence": number 0–1 (required for photo-detected items),
    "detectedFromPhoto": boolean (true if visibly seen in photo, false if recipe-inferred),
    "possibleAlternative": string optional (if unsure: "may be X instead")
  }],
  "steps": [{ "order": number starting at 1, "instruction": string, "durationMinutes": number optional }],
  "notes": string[] (tips, substitutions, caveats; include calorie/time assumptions when relevant)
}

CALORIE / NUTRITION:
- Focus on accurate ingredient names and measurable quantities (grams, ml, cups, tbsp).
- The server calculates calories from the USDA FoodData Central database — you do not need precise calorie math.
- Still provide realistic calories if you can, but ingredient quantities matter more than calorie totals.

TIME METHODOLOGY:
- prepTimeMinutes: washing, chopping, mixing before any heat.
- cookTimeMinutes: longest active cooking window (simmering 20 min while oven bakes 25 min → cookTimeMinutes ≈ 25, not 45).
- Put durationMinutes on cook steps; their sum should be within ~20% of cookTimeMinutes.
- Do NOT inflate cook time when servings increase (same pot, same oven).

SERVINGS METHODOLOGY:
- Single restaurant bowl/plate ≈ 1 serving. Family casserole/sheet pan ≈ 4–6. Large soup pot ≈ 6–8.
- Ingredient quantities must match the servings count exactly.

When the user provides a written description, treat it as a hard constraint unless unsafe — match ingredients, method, and substitutions exactly.

When a food photo is provided, inspect it carefully before writing JSON (see image analysis rules).`;

const IMAGE_ANALYSIS_RULES = `PHOTO ANALYSIS (mandatory — write visualAnalysis field from this):
Study the image in detail before guessing from the dish name alone.
- Dish type & cuisine: pasta, rice bowl, soup, salad, curry, stir-fry, baked good, sandwich, etc.
- Visible ingredients: every protein, vegetable, herb, cheese, sauce, grain, garnish (e.g. rigatoni vs penne, peas, tomato chunks, cream vs tomato sauce, char marks).
- Colors & texture: glossy sauce, crispy skin, golden crust, fresh herbs, oil sheen, broth clarity.
- Cooking method cues: grilled, fried, baked, braised, raw/fresh, one-pot, restaurant plating.
- Portion & vessel: single bowl, dinner plate, sheet pan, large pot — infer realistic servings (1 for a single plated meal, 4–6 for a tray/pot).
- Confidence: if blurry, cropped, or ambiguous, lower confidenceScore and explain uncertainty in notes.

RECIPE RULES AFTER ANALYSIS:
- visualAnalysis: describe exactly what you see (2–4 sentences).
- For EVERY ingredient visible or strongly implied in the photo: set detectedFromPhoto: true and an honest confidence (0.55–1.0).
  - Clearly visible (e.g. green peas, melted cheese) → confidence 0.85–0.98
  - Partly hidden or ambiguous (e.g. white sauce vs cheese) → confidence 0.55–0.75, add possibleAlternative
  - Do NOT list ingredients you cannot see at all with detectedFromPhoto: true
- Ingredients only needed for the recipe but NOT visible (e.g. salt, oil used in cooking): detectedFromPhoto: false, confidence 0.95
- Ingredient list reflects visible components AND user description (description wins for substitutions).
- recipeTitle matches the photo when a photo exists.
- Steps explain how to achieve the look in the image (sauce consistency, doneness, assembly).
- First note: brief summary — "From your photo: …" plus how you applied their description.
- List any possibly missing visible items in notes[] as "You may also have: …" so the user can add them.`;

const DESCRIPTION_RULES = `USER DESCRIPTION (highest priority after safety):
Read every word of the user's description. Extract and obey:
- Named ingredients they have or want ("use frozen peas", "no dairy", "chicken instead of beef")
- How they want to cook ("one-pan", "air fryer", "under 30 min", "meal prep")
- Flavor/texture ("mild spice", "extra creamy", "crispy", "like the photo")
- Servings or dietary needs if mentioned
If the description conflicts with the photo, follow the description for method and substitutions; keep photo-accurate visuals for unmentioned parts.
If the description is empty, rely on the photo and dish name only.`;

function stripJsonFromContent(raw) {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fence) text = fence[1].trim();
  return text;
}

function parseRecipeJson(raw) {
  const text = stripJsonFromContent(raw);
  const parsed = JSON.parse(text);
  return RecipeResultSchema.parse(parsed);
}

function normalizeRecipe(recipe) {
  const steps = [...recipe.steps].sort((a, b) => a.order - b.order);
  const renumbered = steps.map((s, i) => ({ ...s, order: i + 1 }));

  let prep = Math.max(0, Math.round(recipe.prepTimeMinutes));
  let cook = Math.max(0, Math.round(recipe.cookTimeMinutes));

  const cookStepMinutes = renumbered
    .filter((s) => s.durationMinutes != null && s.durationMinutes > 0)
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  if (cookStepMinutes > 0 && cook > 0) {
    const ratio = cookStepMinutes / cook;
    if (ratio > 1.35 || ratio < 0.55) {
      cook = Math.round((cook + cookStepMinutes) / 2);
    }
  }

  prep = Math.min(180, prep);
  cook = Math.min(480, cook);

  const reconciled = reconcileNutrition({
    ...recipe,
    steps: renumbered,
    prepTimeMinutes: prep,
    cookTimeMinutes: cook,
    totalTimeMinutes: prep + cook,
  });

  return reconciled;
}

async function finalizeRecipe(recipe) {
  const normalized = normalizeRecipe(recipe);
  return enrichRecipeNutrition(normalized);
}

/**
 * @param {OpenAI} openai
 * @param {string} primaryModel
 * @param {string} fallbackModel
 * @param {number} temperature
 * @param {() => Promise<Array<{ role: string; content: unknown }>>} getMessages
 */
/**
 * @param {{ goal?: string; skill?: string; time?: string; diet?: string | null } | null | undefined} prefs
 */
export function buildPreferenceInstructions(prefs) {
  if (!prefs) return '';
  const { goal, skill, time, diet } = prefs;
  const lines = ['User preferences (follow these when choosing dish style, ingredients, and step detail):'];
  if (goal === 'learn') {
    lines.push('- Learning focus: explain techniques briefly where it helps a newer cook.');
  } else if (goal === 'quick') {
    lines.push('- Speed: prioritize fewer steps and faster methods; avoid unnecessarily long prep.');
  } else if (goal === 'healthy') {
    lines.push('- Health: favor balanced meals, vegetables, lean proteins; suggest lighter swaps in notes when relevant.');
  } else if (goal === 'budget') {
    lines.push('- Budget: use affordable, common ingredients; avoid rare specialty items unless essential.');
  }
  if (skill === 'beginner') {
    lines.push('- Skill: beginner — simple techniques, clear wording, avoid advanced jargon.');
  } else if (skill === 'intermediate') {
    lines.push('- Skill: intermediate — standard home-cooking techniques are fine.');
  } else if (skill === 'advanced') {
    lines.push('- Skill: advanced — refined techniques and chef-style detail are welcome.');
  }
  if (time === '10-15') {
    lines.push('- Time: aim for about 10–15 minutes total (prep + cook) when realistic; if the dish cannot fit, say so in notes and get as close as possible.');
  } else if (time === '30') {
    lines.push('- Time: aim for roughly ~30 minutes total.');
  } else if (time === '60+') {
    lines.push('- Time: longer recipes (around an hour or more) are OK.');
  }
  if (diet === 'vegetarian') {
    lines.push('- Diet: vegetarian — no meat or fish; dairy/eggs allowed unless you choose a fully plant-based variant and state it.');
  } else if (diet === 'vegan') {
    lines.push('- Diet: vegan — no animal products (meat, fish, dairy, eggs, honey).');
  } else if (diet === 'halal') {
    lines.push('- Diet: halal — no pork or alcohol; use halal-friendly ingredients.');
  } else if (diet === 'none') {
    lines.push('- Diet: no specific restriction.');
  }
  if (lines.length === 1) return '';
  return `\n\n${lines.join('\n')}`;
}

function buildUserContextBlock({ dishName, recipeDetails, cookingStyle, hasImage }) {
  const lines = [];
  const name = typeof dishName === 'string' ? dishName.trim() : '';
  const details = typeof recipeDetails === 'string' ? recipeDetails.trim() : '';
  const style = typeof cookingStyle === 'string' ? cookingStyle.trim() : '';
  const combinedDetails = [details, style && !details.toLowerCase().includes(style.toLowerCase()) ? style : '']
    .filter(Boolean)
    .join('. ');

  if (combinedDetails) {
    lines.push(`User's exact words:\n"""${combinedDetails}"""\n`);
  }

  if (hasImage && name) {
    lines.push(
      `Dish name from user: "${name}". Cross-check this label against the photo — if the photo shows something different, trust the photo for the recipe title and ingredients, but still honor the user's description above.`
    );
  } else if (hasImage && !name) {
    lines.push(
      'No dish name provided — identify the dish entirely from the photo. Lower confidenceScore if identification is uncertain.'
    );
  } else if (name) {
    lines.push(`Dish requested: "${name}".`);
  }

  return lines.length ? `${lines.join('\n')}\n\n` : '';
}

async function withPrimaryFallback(openai, primaryModel, fallbackModel, temperature, getMessages) {
  const tryModel = async (model) => {
    const messages = await getMessages();
    const completion = await openai.chat.completions.create({
      model,
      temperature,
      response_format: { type: 'json_object' },
      messages,
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('Empty model response');
    return content;
  };

  try {
    const raw = await tryModel(primaryModel);
    return finalizeRecipe(parseRecipeJson(raw));
  } catch (primaryErr) {
    if (!fallbackModel || fallbackModel === primaryModel) {
      throw primaryErr;
    }
    try {
      const raw = await tryModel(fallbackModel);
      return finalizeRecipe(parseRecipeJson(raw));
    } catch (fallbackErr) {
      const p = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      const f = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      throw new Error(`Recipe generation failed. Primary: ${p}. Fallback: ${f}`);
    }
  }
}

/**
 * @param {OpenAI} openai
 * @param {{ primary: string; fallback: string }} models
 */
export async function recipeFromDishName(openai, models, dishName, recipeDetails, cookingStyle, preferences) {
  const prefBlock = buildPreferenceInstructions(preferences);
  const context = buildUserContextBlock({ dishName, recipeDetails, cookingStyle, hasImage: false });
  const user = `${context}${DESCRIPTION_RULES}

You do not have live web access. Use your knowledge as if you summarized trustworthy recipes from major cooking sites and classic techniques. Prefer widely recognized versions of the dish unless the user's description asks for a specific variant. If the name is vague, choose the most common interpretation and explain briefly in notes.
${prefBlock}

Return JSON only.`;

  return withPrimaryFallback(openai, models.primary, models.fallback, 0.4, async () => [
    { role: 'system', content: JSON_ONLY_SYSTEM },
    { role: 'user', content: user },
  ]);
}

/**
 * @param {OpenAI} openai
 * @param {{ primary: string; fallback: string }} models
 */
export async function recipeFromImage(
  openai,
  models,
  base64,
  mimeType,
  dishHint,
  recipeDetails,
  cookingStyle,
  preferences
) {
  const mime = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
  const dataUrl = `data:${mime};base64,${base64}`;

  const prefBlock = buildPreferenceInstructions(preferences);
  const context = buildUserContextBlock({
    dishName: dishHint,
    recipeDetails,
    cookingStyle,
    hasImage: true,
  });

  const userText = `${context}${DESCRIPTION_RULES}

${IMAGE_ANALYSIS_RULES}

Produce a complete recipe JSON: title, servings, realistic prep/cook/total times, calories + caloriesPerServing (total for all servings), visualAnalysis, ingredients with measurable quantities, and numbered steps grouped prep → cook → serve. Add durationMinutes on cook steps. Match the photo and user description as closely as possible.
${prefBlock}

Return JSON only.`;

  return withPrimaryFallback(openai, models.primary, models.fallback, 0.35, async () => [
    { role: 'system', content: JSON_ONLY_SYSTEM },
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
        { type: 'text', text: userText },
      ],
    },
  ]);
}
