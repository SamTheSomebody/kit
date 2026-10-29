/* THE TYPE EDITORS. An inspector is composed of properties, and a property
 * is drawn by the editor registered for its type: one registry, so every
 * inspector draws a number, a colour or an enum the same way, and a tool adds
 * a type (an ease, an asset ref) by registering an editor rather than by
 * growing a switch.
 *
 * Every editor takes the same props (`EditorProps`): the property, its value,
 * whether it is read only, whether it sits in a compact cell, and `onchange`.
 * What a value MEANS (scaling, storage format, undo gestures) is the tool's;
 * an editor only shows and proposes.
 *
 * `createRegistry` (`registry.ts`) is the mechanism alone, so a tool whose entries carry more
 * than an editor (a block that lays out child fields) can keep its own entry
 * shape and still resolve the same way: `editor` names an entry outright,
 * otherwise the highest positive `match` wins and ties go to the last
 * registered. */

import type { Component } from "svelte";

import { createRegistry, type Registry } from "./registry.ts";

import BooleanEditor from "./booleanEditor.svelte";
import ColorEditor from "./colorEditor.svelte";
import EnumEditor from "./enumEditor.svelte";
import NumberEditor from "./numberEditor.svelte";
import StringEditor from "./stringEditor.svelte";
import ValueEditor from "./valueEditor.svelte";
import VectorEditor from "./vectorEditor.svelte";

/** What every property says: its type, and optionally the editor to use whatever its type. */
export interface Property {
	readonly type: string;
	readonly editor?: string;
}

export interface NumberProperty extends Property {
	readonly type: "number";
	readonly min?: number;
	readonly max?: number;
	readonly step?: number;
	readonly unit?: string;
	/** Draw a slider over this range; `elastic` lets a typed value stretch it up to min/max. */
	readonly slider?: { readonly min: number; readonly max: number; readonly elastic: boolean };
}

export interface BooleanProperty extends Property {
	readonly type: "boolean";
}

export interface EnumProperty extends Property {
	readonly type: "enum";
	readonly options: readonly { readonly value: string; readonly label: string }[];
}

export interface StringProperty extends Property {
	readonly type: "string";
}

/** A fixed list of numbers under axis letters (x, y), edited side by side. */
export interface VectorProperty extends Property {
	readonly type: "vector";
	readonly axes: readonly string[];
	readonly step?: number;
	readonly unit?: string;
}

/** `hex` stores `#rrggbb`; `number` stores `0xRRGGBB`. */
export interface ColorProperty extends Property {
	readonly type: "color";
	readonly format: "hex" | "number";
}

/** The properties the kit's own editors draw. */
export type BuiltInProperty =
	| NumberProperty
	| BooleanProperty
	| EnumProperty
	| StringProperty
	| VectorProperty
	| ColorProperty;

export interface EditorProps<TProperty extends Property = Property> {
	readonly property: TProperty;
	readonly value: unknown;
	readonly readonly: boolean;
	/** In a table cell rather than a property row: the editor keeps to one compact control. */
	readonly compact: boolean;
	/** Proposes a value. The tool validates and stores it. */
	readonly onchange: (value: unknown) => void;
}

export interface EditorDefinition<TProperty extends Property = Property> {
	/** Unique; a property's `editor` names one by it. Registering an id again replaces it. */
	readonly id: string;
	/** Priority for a property: 0 = not applicable. */
	readonly match: (property: Property) => number;
	readonly component: Component<EditorProps<TProperty>>;
}

/** Priority of a type's own editor. */
export const EDITOR_DEFAULT = 10;
/** Priority of an editor chosen by name only. */
export const EDITOR_NAMED = 100;

/** Types an editor for the registry, which stores every editor with its property type erased. */
export const defineEditor = <TProperty extends Property>(definition: EditorDefinition<TProperty>): EditorDefinition =>
	definition as EditorDefinition;

const typeIs =
	(type: string) =>
	(property: Property): number =>
		property.type === type ? EDITOR_DEFAULT : 0;

/** The kit's editors: one per built-in property type, and a read-only fallback for any other. */
export const editors: Registry<Property, EditorDefinition> = createRegistry<Property, EditorDefinition>({
	named: (property) => property.editor,
	builtIns: () => [
		defineEditor({ id: "value", match: () => 1, component: ValueEditor }),
		defineEditor({ id: "number", match: typeIs("number"), component: NumberEditor }),
		defineEditor({ id: "boolean", match: typeIs("boolean"), component: BooleanEditor }),
		defineEditor({ id: "enum", match: typeIs("enum"), component: EnumEditor }),
		defineEditor({ id: "string", match: typeIs("string"), component: StringEditor }),
		defineEditor({ id: "vector", match: typeIs("vector"), component: VectorEditor }),
		defineEditor({ id: "color", match: typeIs("color"), component: ColorEditor }),
	],
});

export { createRegistry, type Registry };
