#!/usr/bin/env node
/* Checks what each package would publish: nothing that is only for working
   on the kit (tests, tsconfigs, the fidelity harness, nested package.json),
   and a shipped file behind every `exports` target. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const WORKSPACES = ["kit", "dock", "panels"];
const DEV_ONLY = [/(^|\/)tests?\//, /\.test\.ts$/, /(^|\/)tsconfig\.json$/, /^fidelity\//, /^cssAllow\.json$/, /.\/package\.json$/];

/** Every file path an `exports` value points at, wildcards kept. */
const targets = (value) =>
	typeof value === "string" ? [value] : Object.values(value).flatMap((entry) => targets(entry));

const matches = (target, files) => {
	const path = target.replace(/^\.\//, "");
	if (!path.includes("*")) return files.has(path);
	const [head, tail] = path.split("*");
	return [...files].some((file) => file.startsWith(head) && file.endsWith(tail));
};

let problems = 0;
for (const workspace of WORKSPACES) {
	const [pack] = JSON.parse(
		execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: workspace, encoding: "utf8" }),
	);
	const files = new Set(pack.files.map((file) => file.path));
	const report = (message) => {
		problems++;
		console.error(`${workspace}: ${message}`);
	};
	for (const file of files) {
		if (DEV_ONLY.some((pattern) => pattern.test(file))) report(`ships dev-only file ${file}`);
	}
	const { exports } = JSON.parse(readFileSync(`${workspace}/package.json`, "utf8"));
	for (const target of new Set(targets(exports))) {
		if (!matches(target, files)) report(`exports ${target}, which is not in the tarball`);
	}
	console.log(`${workspace}: ${files.size} files`);
}
process.exit(problems === 0 ? 0 : 1);
