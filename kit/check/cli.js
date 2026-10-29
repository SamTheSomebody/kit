#!/usr/bin/env node
/* kit-check: holds a consumer's tool chrome to the kit's rules.

   Config is the `kitCheck` field of the package.json in the working
   directory: `include` (folders of tool chrome, default ["src"]) and
   `exclude` (folders inside them to skip). Findings already there when the
   check was adopted live in `kit-check.baseline.json`, as a count per file
   and rule. A count may only go down: a new finding fails, and a fixed one
   is locked in by `--update`.

   kit-check            check; exit 1 on anything past the baseline
   kit-check --all      also list the baselined findings
   kit-check --update   rewrite the baseline to the current counts */

import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { checkCss, checkSvelte, lineOf } from "./check.js";

const BASELINE_FILE = "kit-check.baseline.json";
const SKIP_DIRECTORIES = new Set(["node_modules", ".svelte-kit", ".vite", "dist", "build"]);

/** @typedef {import('./rules.js').Finding} Finding */
/** @typedef {{ file: string, line: number, rule: string, message: string }} Located */

const root = process.cwd();
const args = new Set(process.argv.slice(2));

/**
 * @param {string} path
 * @returns {unknown}
 */
const readJson = (path) => {
	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch {
		return undefined;
	}
};

const packageJson = /** @type {{ kitCheck?: { include?: string[], exclude?: string[] } } | undefined} */ (
	readJson(join(root, "package.json"))
);
const include = packageJson?.kitCheck?.include ?? ["src"];
const exclude = (packageJson?.kitCheck?.exclude ?? []).map((path) => join(root, path));

/**
 * @param {string} directory
 * @returns {string[]}
 */
const walk = (directory) => {
	if (exclude.some((path) => directory === path || directory.startsWith(path + sep))) return [];
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) return SKIP_DIRECTORIES.has(entry.name) ? [] : walk(path);
		return /\.(?:svelte|css)$/.test(entry.name) ? [path] : [];
	});
};

const files = include.flatMap((path) => {
	const absolute = join(root, path);
	if (!existsSync(absolute)) {
		console.error(`kit-check: include "${path}" does not exist`);
		process.exitCode = 1;
		return [];
	}
	return statSync(absolute).isDirectory() ? walk(absolute) : [absolute];
});

/** @type {Located[]} */
const findings = [];
for (const path of files.sort()) {
	const source = readFileSync(path, "utf8");
	const file = relative(root, path).split(sep).join("/");
	/** @type {Finding[]} */
	let found;
	try {
		found = path.endsWith(".svelte") ? checkSvelte(source) : checkCss(source);
	} catch (error) {
		console.error(`${file}: kit-check could not parse it (${error instanceof Error ? error.message : error})`);
		process.exitCode = 1;
		continue;
	}
	for (const { rule, start, message } of found) {
		findings.push({ file, line: lineOf(source, start), rule, message });
	}
}

/**
 * @param {Located} finding
 * @returns {string}
 */
const keyOf = (finding) => `${finding.file} ${finding.rule}`;
/** @type {Map<string, number>} */
const counts = new Map();
for (const finding of findings) {
	if (finding.rule === "allow") continue;
	counts.set(keyOf(finding), (counts.get(keyOf(finding)) ?? 0) + 1);
}

const baselinePath = join(root, BASELINE_FILE);
if (args.has("--update")) {
	const sorted = Object.fromEntries([...counts].sort(([a], [b]) => a.localeCompare(b)));
	writeFileSync(baselinePath, `${JSON.stringify(sorted, null, "\t")}\n`);
	console.log(`kit-check: wrote ${counts.size} entries to ${BASELINE_FILE}`);
}

const baseline = /** @type {Record<string, number>} */ (readJson(baselinePath) ?? {});
/** @param {Located} finding */
const print = (finding) => console.log(`${finding.file}:${finding.line}  ${finding.rule}  ${finding.message}`);

let failed = 0;
for (const finding of findings) {
	const allowed = finding.rule === "allow" ? 0 : (baseline[keyOf(finding)] ?? 0);
	const over = (counts.get(keyOf(finding)) ?? 1) > allowed;
	if (over) failed++;
	if (over || args.has("--all")) print(finding);
}

const shrunk = Object.entries(baseline).filter(([key, count]) => (counts.get(key) ?? 0) < count);
if (shrunk.length > 0 && !args.has("--update")) {
	console.log(
		`kit-check: ${shrunk.length} baseline entr${shrunk.length === 1 ? "y" : "ies"} shrank; run kit-check --update to lock it in`,
	);
}
if (failed > 0) {
	console.log(
		`kit-check: ${failed} finding${failed === 1 ? "" : "s"} in files past their baseline (every finding of an over-count file and rule is listed). Fix them, or mark a real exception with a reason: /* kit-allow <rule>: <why> */ or <!-- kit-allow <rule>: <why> -->`,
	);
	process.exitCode = 1;
} else if (process.exitCode !== 1) {
	console.log(
		`kit-check: ${files.length} files, ${findings.length} baselined finding${findings.length === 1 ? "" : "s"}, nothing new`,
	);
}
