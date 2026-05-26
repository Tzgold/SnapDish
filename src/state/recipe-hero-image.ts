/** In-memory hero image for the current recipe result (too large for route params). */
let heroImageUri: string | null = null;

export function setRecipeHeroImage(uri: string | null) {
  heroImageUri = uri;
}

export function getRecipeHeroImage(): string | null {
  return heroImageUri;
}

export function clearRecipeHeroImage() {
  heroImageUri = null;
}
