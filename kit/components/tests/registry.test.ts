import { describe, expect, it } from "vitest";

import { createRegistry } from "../registry.ts";

type Entry = { readonly id: string; readonly match: (target: { type: string; editor?: string }) => number };

const make = () =>
	createRegistry<{ type: string; editor?: string }, Entry>({
		named: (target) => target.editor,
		builtIns: () => [
			{ id: "fallback", match: () => 1 },
			{ id: "number", match: (target) => (target.type === "number" ? 10 : 0) },
		],
	});

describe("createRegistry", () => {
	it("picks the best match, falling back", () => {
		const registry = make();
		expect(registry.resolve({ type: "number" })?.id).toBe("number");
		expect(registry.resolve({ type: "other" })?.id).toBe("fallback");
	});

	it("lets a later registration win a tie and a name win outright", () => {
		const registry = make();
		registry.register({ id: "slider", match: (target) => (target.type === "number" ? 10 : 0) });
		expect(registry.resolve({ type: "number" })?.id).toBe("slider");
		expect(registry.resolve({ type: "number", editor: "number" })?.id).toBe("number");
	});

	it("replaces by id, and the undo puts the replaced entry back", () => {
		const registry = make();
		const undo = registry.register({ id: "number", match: () => 50 });
		expect(registry.list().filter((entry) => entry.id === "number")).toHaveLength(1);
		expect(registry.resolve({ type: "other" })?.id).toBe("number");
		undo();
		expect(registry.list().map((entry) => entry.id)).toEqual(["fallback", "number"]);
		expect(registry.resolve({ type: "number" })?.id).toBe("number");
		expect(registry.resolve({ type: "other" })?.id).toBe("fallback");
	});

	it("undoes a new registration by removing it", () => {
		const registry = make();
		const undo = registry.register({ id: "slider", match: () => 99 });
		undo();
		undo();
		expect(registry.list().map((entry) => entry.id)).toEqual(["fallback", "number"]);
	});
});
