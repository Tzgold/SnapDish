import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import OpenAI from 'openai';
import { z } from 'zod';

const app = express();
app.use(cors());
app.use(express.json({ limit: '12mb' }));

const port = Number(process.env.PORT) || 4000;
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey) {
  console.warn('Warning: OPENAI_API_KEY is not set. POST /api/analyze-recipe will fail.');
}

const openai = new OpenAI({ apiKey: openaiKey || 'missing' });

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

const RecipeResultSchema = z.object({
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

const AnalyzeBodySchema = z
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

async function recipeFromDishName(dishName) {
  const user = `The user wants a complete, cookable recipe for this dish or idea: "${dishName}".

You do not have live web access. Use your knowledge as if you summarized trustworthy recipes from major cooking sites and classic techniques. Prefer widely recognized versions of the dish. If the name is vague, choose the most common interpretation and explain briefly in notes.

Return JSON only.`;

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.45,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: JSON_ONLY_SYSTEM },
      { role: 'user', content: user },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('Empty model response');
  return parseRecipeJson(content);
}

async function recipeFromImage(base64, mimeType, dishHint) {
  const mime = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
  const dataUrl = `data:${mime};base64,${base64}`;

  const hint = dishHint
    ? `The user says this is or should be like: "${dishHint}". Use the photo and this hint together.`
    : 'Identify the dish from the photo if you can.';

  const userText = `${hint}

Produce a complete recipe: title, servings, prep/cook/total times, estimated calories, ingredients with quantities, and numbered steps with optional per-step durationMinutes. If the image is unclear, lower confidenceScore and say so in notes.`;

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: JSON_ONLY_SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('Empty model response');
  return parseRecipeJson(content);
}

app.post('/api/analyze-recipe', async (req, res) => {
  try {
    if (!openaiKey) {
      return res.status(500).json({ error: 'Server missing OPENAI_API_KEY' });
    }

    const body = AnalyzeBodySchema.parse(req.body);
    const name = typeof body.dishName === 'string' ? body.dishName.trim() : '';
    const hasName = name.length > 0;
    const cleanB64 = body.imageBase64
      ? body.imageBase64.replace(/^data:image\/\w+;base64,/, '').trim()
      : '';
    const hasImage = cleanB64.length > 0;

    let recipe;
    if (hasImage && hasName) {
      recipe = await recipeFromImage(cleanB64, body.imageMimeType, name);
    } else if (hasImage) {
      recipe = await recipeFromImage(cleanB64, body.imageMimeType, '');
    } else {
      recipe = await recipeFromDishName(name);
    }

    return res.json({ recipe });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: err.flatten() });
    }
    console.error(err);
    const message = err instanceof Error ? err.message : 'Analysis failed';
    return res.status(500).json({ error: message });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`SnapDish API listening on http://localhost:${port}`);
});
