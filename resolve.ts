import type { LayoutPlace, LayoutRecipe, ResolvedRow } from './types.ts';

export type LayoutParent = { recipe?: LayoutRecipe; place?: LayoutPlace };

export type LayoutRowInput = { recipe?: LayoutRecipe; place?: LayoutPlace };

const DEFAULT_PLACE: Record<LayoutRecipe, LayoutPlace> = { fields: 'center', toolbar: 'center', stack: 'pack' };

export const resolveRow = (parent: LayoutParent, row: LayoutRowInput = {}): ResolvedRow => {
  const recipe = row.recipe ?? parent.recipe ?? 'stack';
  const place = row.place ?? parent.place ?? DEFAULT_PLACE[recipe];
  return { recipe, place };
};
