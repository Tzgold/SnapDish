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
  "calories": number (rough estimate),
  "rating": number between 1 and 5 (quality of the recipe as written),
  "confidenceScore": number between 0 and 1 (how well this matches the user's request),
  "ingredients": [{ "name": string, "quantity": string, "optional": boolean optional }],
  "steps": [{ "order": number starting at 1, "instruction": string, "durationMinutes": number optional }],
  "notes": string[] (tips, substitutions, or caveats)
}
Ensure totalTimeMinutes is close to prepTimeMinutes + cookTimeMinutes. Steps must be ordered and practical.`;

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
export async function recipeFromDishName(openai, models, dishName, preferences) {
  const prefBlock = buildPreferenceInstructions(preferences);
  const user = `The user wants a complete, cookable recipe for this dish or idea: "${dishName}".

You do not have live web access. Use your knowledge as if you summarized trustworthy recipes from major cooking sites and classic techniques. Prefer widely recognized versions of the dish. If the name is vague, choose the most common interpretation and explain briefly in notes.
${prefBlock}

Return JSON only.`;

  return withPrimaryFallback(openai, models.primary, models.fallback, 0.45, async () => [
    { role: 'system', content: JSON_ONLY_SYSTEM },
    { role: 'user', content: user },
  ]);
}

/**
 * @param {OpenAI} openai
 * @param {{ primary: string; fallback: string }} models
 */
export async function recipeFromImage(openai, models, base64, mimeType, dishHint, preferences) {
  const mime = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
  const dataUrl = `data:${mime};base64,${base64}`;

  const hint = dishHint
    ? `The user says this is or should be like: "${dishHint}". Use the photo and this hint together.`
    : 'Identify the dish from the photo if you can.';

  const prefBlock = buildPreferenceInstructions(preferences);

  const userText = `${hint}

Produce a complete recipe: title, servings, prep/cook/total times, estimated calories, ingredients with quantities, and numbered steps with optional per-step durationMinutes. If the image is unclear, lower confidenceScore and say so in notes.
${prefBlock}`;

  return withPrimaryFallback(openai, models.primary, models.fallback, 0.4, async () => [
    { role: 'system', content: JSON_ONLY_SYSTEM },
    {
      role: 'user',
      content: [
        { type: 'text', text: userText },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    },
  ]);
}
