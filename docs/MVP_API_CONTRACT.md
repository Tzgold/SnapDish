# SnapDish MVP API Contract

## Endpoint

- `POST /api/analyze-recipe`

## Request JSON

```json
{
  "inputType": "link",
  "sourceUrl": "https://www.youtube.com/shorts/abc123"
}
```

or

```json
{
  "inputType": "image",
  "imageBase64": "base64-encoded-image"
}
```

## Response JSON

```json
{
  "recipe": {
    "recipeTitle": "Crispy Garlic Butter Chicken Pasta",
    "servings": 2,
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 25,
    "totalTimeMinutes": 40,
    "confidenceScore": 0.88,
    "ingredients": [
      { "name": "Chicken breast", "quantity": "250 g", "optional": false }
    ],
    "steps": [
      { "order": 1, "instruction": "Boil pasta in salted water.", "durationMinutes": 10 }
    ],
    "notes": ["Adjust salt to taste."]
  }
}
```

## Validation Rules

- `inputType` must be either `link` or `image`.
- When `inputType` is `link`, `sourceUrl` is required.
- When `inputType` is `image`, `imageBase64` is required.
- `steps` must be in correct order, starting from 1.
- `totalTimeMinutes` should be close to `prepTimeMinutes + cookTimeMinutes`.

## Backend Todo

- Validate input payload with Zod.
- Normalize and sanitize model output before sending to app.
- Cache link analysis by URL hash to reduce AI cost.
