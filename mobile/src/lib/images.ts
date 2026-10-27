import type { ImageSource } from 'expo-image';

// Originele foodfoto's uit het designsystem; recepten zonder foto krijgen de beeldloze kaart.
const FOOD: Record<string, ImageSource> = {
  '/assets/wraps.png': require('../../assets/food/wraps.png'),
  '/assets/pasta.png': require('../../assets/food/pasta.png'),
  '/assets/roasted-bowl.png': require('../../assets/food/roasted-bowl.png'),
};

export function recipeImage(path: string | null | undefined): ImageSource | null {
  return path ? FOOD[path] ?? null : null;
}
