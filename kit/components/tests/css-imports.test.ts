import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/* Each control loads the CSS it draws with, so importing one component on
   its own (without `components/index.css`) still renders it. A menu
   imported alone used to have no ground: its surface variables live in
   `controls.css`, which only `index.css` loaded. */

const components = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const kit = resolve(components, "..");

const withoutComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, "");
const classesIn = (css: string): string[] => [...withoutComments(css).matchAll(/\.([a-zA-Z][\w-]*)/g)].map((match) => match[1] ?? "");

/** Classes a stylesheet defines, following its `@import`s. */
const cssClasses = (file: string, seen = new Set<string>()): Set<string> => {
	if (seen.has(file)) return new Set();
	seen.add(file);
	const css = readFileSync(file, "utf8");
	const found = new Set(classesIn(css));
	for (const match of withoutComments(css).matchAll(/@import\s+['"]([^'"]+)['"]/g)) {
		for (const name of cssClasses(resolve(dirname(file), match[1] ?? ""), seen)) found.add(name);
	}
	return found;
};

/** Classes loaded by a component: its CSS imports, its <style>, and the same for the components it renders. */
const loadedBy = (file: string, seen = new Set<string>()): Set<string> => {
	if (seen.has(file) || !existsSync(file)) return new Set();
	seen.add(file);
	const source = readFileSync(file, "utf8");
	const found = new Set<string>();
	for (const match of source.matchAll(/import\s+(?:[\w{}\s,*]+from\s+)?["'](\.[^"']+)["']/g)) {
		const path = resolve(dirname(file), match[1] ?? "");
		if (path.endsWith(".css")) for (const name of cssClasses(path)) found.add(name);
		if (path.endsWith(".svelte")) for (const name of loadedBy(path, seen)) found.add(name);
	}
	const style = /<style[^>]*>([\s\S]*?)<\/style>/.exec(source)?.[1];
	if (style !== undefined) for (const name of classesIn(style)) found.add(name);
	return found;
};

const sheets = [
	...readdirSync(kit).filter((name) => name.endsWith(".css")).map((name) => join(kit, name)),
	...readdirSync(components).filter((name) => name.endsWith(".css")).map((name) => join(components, name)),
];
const kitClasses = new Set(sheets.flatMap((sheet) => classesIn(readFileSync(sheet, "utf8"))));

const controls = readdirSync(components)
	.filter((name) => name.endsWith(".svelte"))
	.map((name) => join(components, name));

describe("component stylesheets", () => {
	it.each(controls.map((file) => [file.slice(kit.length + 1), file]))("%s loads every kit class it draws", (_, file) => {
		const markup = readFileSync(file, "utf8")
			.replace(/<style[\s\S]*?<\/style>/, "")
			.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|\/\/[^\n]*/g, "");
		const drawn = new Set([...markup.matchAll(/\b((?:kit|dock)-[a-z][\w-]*)\b/g)].map((match) => match[1] ?? ""));
		const loaded = loadedBy(file);
		const missing = [...drawn].filter((name) => kitClasses.has(name) && !loaded.has(name));
		expect(missing).toEqual([]);
	});

	it.each(controls.map((file) => [file.slice(kit.length + 1), file]))("%s loads controls.css with its own sheet", (_, file) => {
		const source = readFileSync(file, "utf8");
		const ownSheets = [...source.matchAll(/import\s+["'](\.\/[\w-]+\.css)["']/g)].map((match) => match[1]);
		if (ownSheets.length === 0) return;
		expect(ownSheets[0]).toBe("./controls.css");
	});
});
