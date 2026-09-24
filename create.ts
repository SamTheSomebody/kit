import type { LayoutPlace, LayoutRecipe, LayoutSize } from './types.ts';

const SIZE_ATTR = 'data-size';
const RECIPE_ATTR = 'data-recipe';
const PLACE_ATTR = 'data-place';
const PAD_ATTR = 'data-pad';
const COLS_ATTR = 'data-cols';

const FILL_PERCENT = /^fill\(([1-9][0-9]?|100)%\)$/;

const applySize = (element: HTMLElement, size: LayoutSize | undefined): void => {
  if (size === undefined) {
    return;
  }
  element.setAttribute(SIZE_ATTR, size);
  const match = FILL_PERCENT.exec(size);
  if (match) {
    element.style.width = `${match[1]}%`;
    element.style.flex = '0 0 auto';
  }
};

const applyRecipe = (element: HTMLElement, recipe: LayoutRecipe | undefined): void => {
  if (recipe !== undefined) {
    element.setAttribute(RECIPE_ATTR, recipe);
  }
};

const applyPlace = (element: HTMLElement, place: LayoutPlace | undefined): void => {
  if (place !== undefined) {
    element.setAttribute(PLACE_ATTR, place);
  }
};

export type ContainerOptions = { size?: LayoutSize; pad?: 0 | 'dock' };

export const createContainer = (options: ContainerOptions = {}): HTMLDivElement => {
  const element = document.createElement('div');
  element.className = 'kit-container';
  applySize(element, options.size ?? 'fill');
  if (options.pad === 0) {
    element.setAttribute(PAD_ATTR, '0');
  }
  return element;
};

export type ColumnsOptions = { cols?: 1 | 2 | 3 };

export const createColumns = (options: ColumnsOptions = {}): HTMLDivElement => {
  const element = document.createElement('div');
  element.className = 'kit-columns';
  const cols = options.cols ?? 2;
  if (cols !== 2) {
    element.setAttribute(COLS_ATTR, String(cols));
  }
  return element;
};

export type ColumnOptions = { recipe?: LayoutRecipe; place?: LayoutPlace; size?: LayoutSize };

export const createColumn = (options: ColumnOptions = {}): HTMLDivElement => {
  const element = document.createElement('div');
  element.className = 'kit-column';
  applyRecipe(element, options.recipe);
  const place = options.place ?? (options.recipe === 'fields' ? 'center' : undefined);
  applyPlace(element, place);
  applySize(element, options.size);
  return element;
};

export type RowOptions = { recipe?: LayoutRecipe; place?: LayoutPlace; wrap?: 'wrap' | 'nowrap' };

export const createRow = (options: RowOptions = {}): HTMLDivElement => {
  const element = document.createElement('div');
  element.className = 'kit-row';
  applyRecipe(element, options.recipe);
  const place = options.place ?? (options.recipe === 'fields' || options.recipe === 'toolbar' ? 'center' : options.recipe === 'stack' ? 'pack' : undefined);
  applyPlace(element, place);
  if (options.wrap !== undefined) {
    element.setAttribute('data-wrap', options.wrap);
  }
  return element;
};

export type SlotOptions = { size?: LayoutSize };

export const createSlot = (options: SlotOptions = {}): HTMLDivElement => {
  const element = document.createElement('div');
  element.className = 'kit-slot';
  applySize(element, options.size ?? 'fit');
  return element;
};

export const createLabel = (text: string): HTMLElement => {
  const element = document.createElement('span');
  element.className = 'kit-label';
  element.textContent = text;
  return element;
};
