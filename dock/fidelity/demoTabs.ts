/**
 * The signed artifact's demo tab registry, ported verbatim — NOT part of the
 * kit contract. It exists so the fidelity screenshots compare content as
 * well as chrome: same tabs, same painters, same pixels, two renderers.
 *
 * The artifact reads its palette off `--tool-*` at paint time; so does this.
 */

import type { DockTabDef, DockTabsPort } from "../types";

const token = (name: string): string =>
	getComputedStyle(document.documentElement).getPropertyValue(`--tool-${name}`).trim();

const rows = (items: [string, string, string][]): HTMLElement => {
	const wrap = document.createElement("div");
	wrap.className = "demo-rows";
	items.forEach(([dot, key, meta]) => {
		const row = document.createElement("div");
		row.className = "demo-row";
		const dotElement = document.createElement("span");
		dotElement.className = `dot ${dot}`;
		const keyElement = document.createElement("span");
		keyElement.className = "k";
		keyElement.textContent = key;
		const metaElement = document.createElement("span");
		metaElement.className = "m";
		metaElement.textContent = meta;
		row.append(dotElement, keyElement, metaElement);
		wrap.append(row);
	});
	return wrap;
};

const paintBoard = (canvas: HTMLCanvasElement): void => {
	canvas.width = 640;
	canvas.height = 420;
	const context = canvas.getContext("2d")!;
	context.fillStyle = token("panel");
	context.fillRect(0, 0, 640, 420);
	const cellWidth = 104,
		cellHeight = 104,
		originX = (640 - 5 * cellWidth - 4 * 8) / 2,
		originY = (420 - 3 * cellHeight - 2 * 8) / 2;
	for (let column = 0; column < 5; column += 1) {
		for (let row = 0; row < 3; row += 1) {
			const x = originX + column * (cellWidth + 8),
				y = originY + row * (cellHeight + 8);
			context.fillStyle = token("bg");
			context.strokeStyle = token("border");
			context.beginPath();
			context.roundRect(x, y, cellWidth, cellHeight, 8);
			context.fill();
			context.stroke();
			const kind = (column * 3 + row) % 4;
			context.save();
			context.translate(x + cellWidth / 2, y + cellHeight / 2);
			if (kind === 0) {
				context.fillStyle = token("accent");
				context.beginPath();
				context.arc(0, 0, 26, 0, 7);
				context.fill();
			} else if (kind === 1) {
				context.strokeStyle = token("muted");
				context.lineWidth = 5;
				context.strokeRect(-24, -24, 48, 48);
			} else if (kind === 2) {
				context.fillStyle = token("highlight");
				context.beginPath();
				context.moveTo(0, -28);
				context.lineTo(26, 0);
				context.lineTo(0, 28);
				context.lineTo(-26, 0);
				context.fill();
			} else {
				context.strokeStyle = token("success");
				context.lineWidth = 5;
				context.beginPath();
				context.arc(0, 0, 24, 0, 7);
				context.stroke();
			}
			context.restore();
		}
	}
	context.fillStyle = token("muted");
	context.font = `12px ${token("font")}`;
	context.fillText("board preview — consumer-rendered content, kit owns chrome only", originX, 412);
};

/** Stand-in for a reference image — deterministic from its hue. */
const paintReference = (canvas: HTMLCanvasElement, hue: number): void => {
	canvas.width = 480;
	canvas.height = 300;
	const context = canvas.getContext("2d")!;
	const gradient = context.createLinearGradient(0, 0, 480, 300);
	gradient.addColorStop(0, `hsl(${hue},52%,24%)`);
	gradient.addColorStop(1, `hsl(${hue + 30},58%,52%)`);
	context.fillStyle = gradient;
	context.fillRect(0, 0, 480, 300);
	let seed = hue;
	const random = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
	context.fillStyle = "rgba(40,42,54,.35)";
	for (let at = 0; at < 9; at += 1) {
		context.fillRect(random() * 440, random() * 270, 34, 18);
	}
	context.fillStyle = "rgba(248,248,242,.28)";
	context.beginPath();
	context.arc(80 + random() * 320, 60 + random() * 180, 34, 0, 7);
	context.fill();
};

const coverTab =
	(hue: number) =>
	(element: HTMLElement): void => {
		const canvas = document.createElement("canvas");
		paintReference(canvas, hue);
		element.append(canvas);
	};

const DEFINITIONS: Record<string, DockTabDef> = {
	game: {
		title: "Game",
		render: (element) => {
			const canvas = document.createElement("canvas");
			canvas.className = "demo-board";
			paintBoard(canvas);
			element.append(canvas);
		},
	},
	timeline: {
		title: "Timeline",
		render: (element) =>
			element.append(
				rows([
					["hot", "round · featureStart", "fence base"],
					["ok", "spin ×10 · reveal", "free spins"],
					["ok", "step · winInfo", "tumble"],
					["ok", "step · tumbleBoard", "→ no win"],
					["", "setGlobalMultiplier", "x2 → x3"],
					["", "setSpinWin · setCounter", ""],
					["hot", "featureEnd · finalWin", "cap 5000x"],
				]),
			),
	},
	config: {
		title: "Config",
		render: (element) =>
			element.append(
				rows([
					["ok", "rtp", "0.9700"],
					["ok", "wincap", "5000x"],
					["", "mechanic", "tumble"],
					["", "base board", "5×3 · cost 1"],
					["", "bonus buy", "6×4 · cost 100"],
				]),
			),
	},
	assets: {
		title: "Assets",
		render: (element) => {
			const wrap = rows([]);
			(
				[
					["symbol_gem", 266],
					["symbol_torch", 36],
					["frame_ice", 204],
					["bg_vault", 212],
					["wild_aurora", 290],
				] as [string, number][]
			).forEach(([name, hue]) => {
				const row = document.createElement("div");
				row.className = "demo-row";
				const swatch = document.createElement("span");
				swatch.className = "sw";
				const canvas = document.createElement("canvas");
				paintReference(canvas, hue);
				swatch.append(canvas);
				row.append(swatch);
				const key = document.createElement("span");
				key.className = "k";
				key.textContent = name;
				const meta = document.createElement("span");
				meta.className = "m";
				meta.textContent = "4.3";
				row.append(key, meta);
				wrap.append(row);
			});
			element.append(wrap);
		},
	},
	paytable: {
		title: "Paytable",
		render: (element) =>
			element.append(
				rows([
					["", "gem ×5", "50.0"],
					["", "gem ×4", "12.5"],
					["", "torch ×5", "25.0"],
					["", "torch ×4", "6.0"],
					["", "scatter ×3", "bonus"],
				]),
			),
	},
	fences: {
		title: "Fences",
		render: (element) =>
			element.append(
				rows([
					["ok", "base", "rtp 0.967"],
					["ok", "bonus", "rtp 0.970"],
					["", "superbuy", "pending"],
				]),
			),
	},
	books: {
		title: "Books",
		render: (element) =>
			element.append(
				rows([
					["ok", "books_base.jsonl", "100k"],
					["ok", "books_bonus.jsonl", "50k"],
					["", "sample-books", "linked"],
				]),
			),
	},
	sim: {
		title: "Sim",
		render: (element) =>
			element.append(
				rows([
					["ok", "spins", "10,000,000"],
					["ok", "measured rtp", "0.96998"],
					["", "acceptance", "0.83"],
				]),
			),
	},
	notes: {
		title: "Notes",
		render: (element) =>
			element.append(
				rows([
					["", "overflow demo", "this strip scrolls"],
					["", "single-line rule", "never wraps"],
				]),
			),
	},
	log: {
		title: "Log",
		render: (element) => {
			const wrap = document.createElement("div");
			wrap.className = "demo-log";
			(
				[
					["14:02:11", "", "shell mounted · DEV"],
					["14:02:11", "ok", "timeline panel docked"],
					["14:02:12", "", "layout editor attached (?layout)"],
					["14:02:14", "warn", "this window floats — drag its ⠿ grip to move"],
					["14:02:15", "", "its strip works like any other: drag tabs or the pane to re-dock"],
				] as [string, string, string][]
			).forEach(([time, kind, text]) => {
				const line = document.createElement("div");
				const stamp = document.createElement("span");
				stamp.className = "t";
				stamp.textContent = time;
				line.append(stamp, document.createTextNode(" "));
				if (kind) {
					const span = document.createElement("span");
					span.className = kind;
					span.textContent = text;
					line.append(span);
				} else {
					line.append(document.createTextNode(text));
				}
				wrap.append(line);
			});
			element.append(wrap);
		},
	},
	"ref-a": { title: "Ref A", fit: "cover", menuPath: "Reference", render: coverTab(204) },
	"ref-b": { title: "Ref B", fit: "cover", menuPath: "Reference", render: coverTab(36) },
};

/* `status` is a tab's light, `menuPath` the folder it falls into under the
   menu's "Open". Set here rather than inline so this stays a mirror of
   the artifact's registry — the fidelity hashes compare the two renderers'
   chrome, so the demo content on each side has to agree exactly. */
DEFINITIONS["log"]!.status = "busy";
DEFINITIONS["sim"]!.status = "ok";
DEFINITIONS["fences"]!.status = "warn";
for (const id of ["timeline", "config", "assets", "paytable", "fences", "books", "sim", "notes"]) {
	DEFINITIONS[id]!.menuPath = "Tools";
}

let externalCount = 0;

/** The consumer's registry — the kit only ever sees ids. */
export const demoTabs: DockTabsPort = { get: (id) => DEFINITIONS[id] };

/** Mint a tab for a dropped external payload (the mood-board case). */
export const mintExternal = (): string => {
	externalCount += 1;
	const id = `ext${externalCount}`;
	DEFINITIONS[id] = { title: `Img ${externalCount}`, fit: "cover", render: coverTab((externalCount * 71) % 360) };
	return id;
};
