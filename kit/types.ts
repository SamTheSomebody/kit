export type LayoutSize = "fit" | "fill" | `fill(${number}%)`;

export type LayoutRecipe = "fields" | "toolbar" | "stack";

export type LayoutPlace = "pack" | "center" | "stretch";

export type LayoutAttrs = {
	size?: LayoutSize;
	recipe?: LayoutRecipe;
	place?: LayoutPlace;
};

export type ResolvedRow = {
	recipe: LayoutRecipe;
	place: LayoutPlace;
};
