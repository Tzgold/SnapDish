import OpenAI from 'openai';
import { z } from 'zod';

const RecipeIngredientSchema = z.object({
  name: z.string(),
  quantity: z.string(),
  optional: z.boolean().optional(),
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
  rating: z.number().optional(),
  confidenceScore: z.number(),
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

const JSON_ONLY_SYSTEM = `You are SnapDish, a cooking assistant. Always respond with a single valid JSON object only (no markdown fences, no extra text).
The JSON must match this shape:
{
  "recipeTitle": string,
  "servings": number,
  "prepTimeMinutes": number,
  "cookTimeMinutes": number,
  "totalTimeMinutes": number,
  "calories": number (total kcal for ALL servings listed, not per serving),
  "rating": number between 1 and 5 (quality of the recipe as written),
  "confidenceScore": number between 0 and 1 (how well this matches the user's request),
  "ingredients": [{ "name": string, "quantity": string, "optional": boolean optional }],
  "steps": [{ "order": number starting at 1, "instruction": string, "durationMinutes": number optional }],
  "notes": string[] (tips, substitutions, or caveats)
}
Ensure totalTimeMinutes equals prepTimeMinutes + cookTimeMinutes (not a separate estimate).
Ingredient quantities must match the servings count (e.g. 4 servings → amounts for 4 people).
List realistic prepTimeMinutes (chopping, marinating) and cookTimeMinutes (active heat: boil, sauté, bake, simmer) separately.
Times should match real techniques — e.g. boiling pasta is ~8–12 min whether servings are 2 or 4; do not inflate cook time just because servings are higher.
Steps must be ordered, practical, and grouped logically: prep/mise steps first, then cook steps, then finish/serve. Use clear action verbs. durationMinutes on cook steps should sum roughly to cookTimeMinutes when possible.

When the user provides a written description, treat it as a hard constraint unless it is impossible — match their ingredients, method, spice level, texture goals, and substitutions exactly when stated.

When a food photo is provided, inspect it carefully before writing the recipe (see image analysis rules in the user message).`;

const IMAGE_ANALYSIS_RULES = `PHOTO ANALYSIS (do this mentally before writing JSON):
Study the image in detail — do not guess from the dish name alone.
- Dish type: pasta, rice, soup, salad, sandwich, baked good, curry, stir-fry, etc.
- Visible ingredients: every protein, vegetable, herb, cheese, sauce, grain, or garnish you can identify (e.g. rigatoni vs penne, peas, tomato chunks, cream vs tomato sauce, melted cheese, char marks).
- Colors & texture: glossy sauce, crispy skin, golden crust, green herbs, oil sheen, broth clarity.
- Cooking cues: grilled, fried, baked, raw/fresh, one-pot, plated restaurant-style.
- Portion context: single bowl, family tray, leftovers — infer sensible servings.
- Confidence: if something is unclear (blurry, cropped, ambiguous), lower confidenceScore and say what you could not verify in notes.

RECIPE RULES AFTER ANALYSIS:
- Ingredient list should reflect what is visible OR what the user asked for in their description; prefer the description when they specify swaps or "use X instead".
- recipeTitle should match what is actually in the photo when a photo exists.
- Steps should describe how to reach the look and components in the image (sauce consistency, doneness, assembly).
- First item in notes[]: one sentence — "From your photo I see: …" plus how you applied their description (if any).`;

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
  return {
    ...recipe,
    steps: renumbered,
    totalTimeMinutes: recipe.prepTimeMinutes + recipe.cookTimeMinutes,
  };
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
    return normalizeRecipe(parseRecipeJson(raw));
  } catch (primaryErr) {
    if (!fallbackModel || fallbackModel === primaryModel) {
      throw primaryErr;
    }
    try {
      const raw = await tryModel(fallbackModel);
      return normalizeRecipe(parseRecipeJson(raw));
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

  const userText = `${context}${IMAGE_ANALYSIS_RULES}

Produce a complete recipe JSON: title, servings, realistic prep/cook/total times, estimated calories (total for all servings), ingredients with quantities, and numbered steps grouped prep → cook → serve. Add durationMinutes on cook steps when helpful. Match the photo and user description as closely as possible.
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
