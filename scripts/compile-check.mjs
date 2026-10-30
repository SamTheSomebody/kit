#!/usr/bin/env node
/* Compiles every shipped .svelte file with the current Svelte and with the
   oldest one the peer range allows (`svelte-min`, pinned in the root
   package.json). Consumers compile the kit's source themselves, so a file
   that only builds on a newer Svelte breaks their build, not ours. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const compilers = [
	["svelte", require("svelte/package.json").version],
	["svelte-min", require("svelte-min/package.json").version],
];

const files = execFileSync("git", ["ls-files", "kit", "dock", "panels"], { encoding: "utf8" })
	.split("\n")
	.filter((file) => file.endsWith(".svelte"));

let failures = 0;
for (const [name, version] of compilers) {
	const { compile } = await import(`${name}/compiler`);
	let failed = 0;
	for (const file of files) {
		try {
			compile(readFileSync(file, "utf8"), { filename: file, generate: "client" });
		} catch (error) {
			failed++;
			console.error(`${file} (svelte ${version}): ${error.message.split("\n")[0]}`);
		}
	}
	console.log(`svelte ${version}: ${files.length - failed}/${files.length} compiled`);
	failures += failed;
}
process.exit(failures === 0 ? 0 : 1);
