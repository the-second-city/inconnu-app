// Creates a glyph (emoji) theme for the Discord bot: the sheet's glyphs, recolored, as
// transparent PNGs and a sprite sheet.
//
// Usage:
//   node scripts/render-glyphs.mjs <theme> [colors...] --bg <top>[,<bottom>] [--out <dir>]
//
// Colors are hex (#RGB or #RRGGBB). Required:
//   --hale          an undamaged Health/Willpower box
//   --superficial   a Superficial damage box
//   --aggravated    an Aggravated damage box
//   --humanity      a filled Humanity diamond
//   --stain         a Stain
//   --degeneration  a degeneration diamond
//   --hunger        a Hunger drop
//   --bg            the background the emoji will sit on (a gradient top to bottom, or one
//                   color); only the preview draws it, beside Discord's light and dark
// Optional (each defaults to the color in brackets):
//   --humanity-empty       an empty Humanity diamond [--hale]
//   --humanity-stroke      a filled Humanity diamond's outline [--humanity]
//   --degeneration-stroke  a degeneration diamond's outline and cross [--degeneration]
//   --hunger-stroke        a Hunger drop's outline [--hunger]
//   --hunger-empty         an empty Hunger drop [--hunger]
//   --potency              a Blood Potency pip [--hunger]
//   --potency-empty        an empty Blood Potency pip [--hunger-empty]
//   --die                  a normal die's faces [--hale]
//   --hunger-die           a Hunger die's faces [--hunger]
//   --text                 the labels on the preview's --bg panel [dark or light, whichever suits it]
//   --out                  the output folder [glyphs/<theme>, which is gitignored]; its png/
//                          and svg/ folders are cleared first
//
// A theme named in THEMES (bruised, peach) needs no colors: it starts from that theme's, and
// any flags override them.
//
// Writes:
//   <out>/png/<theme>_<emoji>.png  each glyph, 128x128 (Discord's emoji size), named for upload
//                                  as the bot's emoji (inconnu's assets/emoji): peach_agg_dmg.png
//   <out>/sprite-sheet.png         every glyph in one row of 128px cells, in GLYPHS order
//   <out>/svg/<theme>_<emoji>.svg  each glyph, 100x100 viewBox
//   <out>/preview.png              the glyphs as tracks over the background, then over
//                                  Discord's light and dark themes, to judge contrast
//
// Example (the peach theme):
//   node scripts/render-glyphs.mjs peach --hale '#6578A7' --superficial '#4775D7' \
//     --aggravated '#3E55CE' --humanity '#445DA9' --humanity-stroke '#5A6FB3' \
//     --humanity-empty '#6A779F' --stain '#8F36B9' --degeneration '#C2187A' \
//     --degeneration-stroke '#FF7AC0' --hunger '#0E7A8A' --hunger-stroke '#138493' \
//     --hunger-empty '#0E7A8A' --die '#6578A7' --hunger-die '#0E7A8A' \
//     --bg '#F7DDB6,#F4D3CC'

import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
	BESTIAL,
	CRITICAL,
	FAILURE,
	HUNGER_CRITICAL,
	SUCCESS
} from '../src/lib/components/characters/glyphs/dice/shapes.ts';

/**
 * A theme's colors, keyed by flag name (without the dashes). `bg` is one color or two,
 * comma-separated.
 * @typedef {Record<string, string>} Colors
 */

/** Saved themes, so they can be rebuilt by name. @type {Record<string, Colors>} */
const THEMES = {
	// The app's bruised, crimson-on-black look (from the glyph components' colors), tuned to read on
	// Discord's light and dark embeds too; the app keeps its own colors
	bruised: {
		hale: '#B1A48F', // Bone, as the normal dice
		superficial: '#FF8585',
		aggravated: '#D81E3F',
		humanity: '#BDB19F', // Bone
		'humanity-stroke': '#897D68',
		'humanity-empty': '#AB9C8B',
		stain: '#D40000',
		degeneration: '#FF0000',
		'degeneration-stroke': '#FF6600',
		hunger: '#DC2626',
		'hunger-stroke': '#EF4444',
		'hunger-empty': '#DC2626',
		die: '#B1A48F', // Bone, as Humanity
		'hunger-die': '#DC2626', // As the Hunger drops
		bg: '#380F10,#0D0706' // The page's crimson pool, falling off to its near-black edge
	},
	// Cool complements to Discord's peach-to-blush theme, tuned to read on Discord's light and
	// dark embeds too
	peach: {
		hale: '#6578A7',
		superficial: '#4775D7',
		aggravated: '#3E55CE',
		humanity: '#445DA9',
		'humanity-stroke': '#5A6FB3',
		'humanity-empty': '#6A779F',
		stain: '#8F36B9',
		degeneration: '#C2187A',
		'degeneration-stroke': '#FF7AC0',
		hunger: '#0E7A8A',
		'hunger-stroke': '#138493',
		'hunger-empty': '#0E7A8A',
		die: '#6578A7',
		'hunger-die': '#0E7A8A',
		bg: '#F7DDB6,#F4D3CC'
	}
};

const REQUIRED = [
	'hale',
	'superficial',
	'aggravated',
	'humanity',
	'stain',
	'degeneration',
	'hunger',
	'bg'
];

/** Optional colors, and the color each falls back to. */
const FALLBACKS = {
	'humanity-empty': 'hale',
	'humanity-stroke': 'humanity',
	'degeneration-stroke': 'degeneration',
	'hunger-stroke': 'hunger',
	'hunger-empty': 'hunger',
	potency: 'hunger',
	'potency-empty': 'hunger-empty',
	die: 'hale',
	'hunger-die': 'hunger'
};

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Prints an error and the usage, and exits.
 * @param {string} message What went wrong
 * @returns {never}
 */
function fail(message) {
	console.error(`${message}\n`);
	console.error(
		'Usage: node scripts/render-glyphs.mjs <theme> [colors...] --bg <top>[,<bottom>] [--out <dir>]'
	);
	console.error('See the top of scripts/render-glyphs.mjs for the color flags.');
	process.exit(1);
}

const colorFlags = [...REQUIRED, ...Object.keys(FALLBACKS), 'text'];
let parsed;
try {
	parsed = parseArgs({
		allowPositionals: true,
		options: Object.fromEntries([...colorFlags, 'out'].map((flag) => [flag, { type: 'string' }]))
	});
} catch (error) {
	fail(/** @type {Error} */ (error).message);
}
const { values, positionals } = parsed;

const theme = positionals[0];
if (!theme || positionals.length > 1) fail('Give exactly one theme name.');
// The theme prefixes Discord emoji names, which are 2-32 letters, numbers, and underscores
if (!/^\w+$/.test(theme)) fail(`Theme names are letters, numbers, and _: "${theme}"`);

/** @type {Colors} */
const colors = { ...THEMES[theme] };
for (const flag of colorFlags) {
	const value = values[flag];
	if (value !== undefined) colors[flag] = value;
}

const missing = REQUIRED.filter((flag) => !colors[flag]);
if (missing.length) fail(`Missing: ${missing.map((flag) => `--${flag}`).join(', ')}`);
for (const [optional, fallback] of Object.entries(FALLBACKS)) {
	colors[optional] ??= colors[fallback];
}

const background = colors.bg.split(',').map((color) => color.trim());
if (background.length > 2) fail('--bg takes one color or two, comma-separated.');
for (const [flag, value] of Object.entries(colors)) {
	for (const color of flag === 'bg' ? background : [value]) {
		if (!HEX.test(color)) fail(`--${flag} isn't a hex color: "${color}"`);
	}
}
const [bgTop, bgBottom = bgTop] = background;

/**
 * A hex color's relative luminance (WCAG).
 * @param {string} hex #RGB or #RRGGBB
 * @returns {number} 0 (black) to 1 (white)
 */
function luminance(hex) {
	const digits = hex.length === 4 ? [...hex.slice(1)].map((d) => d + d) : hex.slice(1).match(/../g);
	const [r, g, b] = (digits ?? []).map((d) => {
		const c = parseInt(d, 16) / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

colors.text ??= luminance(bgTop) + luminance(bgBottom) > 0.4 ? '#2A2020' : '#E8DCCB';

const DROP =
	'M 50,10 C 30,30 20,50 20,65 C 20,80 33,90 50,90 C 67,90 80,80 80,65 C 80,50 70,30 50,10 Z';
const DIAMOND = '50,5 95,50 50,95 5,50';

/**
 * A damage box's outline.
 * @param {string} color Stroke color
 * @returns {string} SVG markup
 */
const box = (color) =>
	`<rect x="5" y="5" width="90" height="90" fill="none" stroke="${color}" stroke-width="10"/>`;

/**
 * A straight line.
 * @param {number[]} points x1, y1, x2, y2
 * @param {string} color Stroke color
 * @param {number} width Stroke width
 * @returns {string} SVG markup
 */
const line = ([x1, y1, x2, y2], color, width) =>
	`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"/>`;

/**
 * A Humanity diamond.
 * @param {string} fill Fill color, or "none"
 * @param {string} stroke Stroke color
 * @param {number} width Stroke width
 * @returns {string} SVG markup
 */
const diamond = (fill, stroke, width) =>
	`<polygon points="${DIAMOND}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="miter"/>`;

/**
 * A Hunger drop.
 * @param {string} fill Fill color, or "none"
 * @param {string} stroke Stroke color
 * @param {number} width Stroke width
 * @returns {string} SVG markup
 */
const drop = (fill, stroke, width) =>
	`<path d="${DROP}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;

/**
 * A die's face.
 * @param {string[]} paths Its paths (glyphs/dice/shapes.ts)
 * @param {string} color Fill color
 * @returns {string} SVG markup
 */
const die = (paths, color) =>
	paths.map((d) => `<path d="${d}" fill="${color}" fill-rule="evenodd"/>`).join('');

/**
 * Each glyph's contents (100x100 viewBox), in sprite-sheet order, keyed by the bot's emoji name
 * (inconnu's assets/emoji). The shapes match the sheet's glyph components
 * (src/lib/components/characters/glyphs/), so keep them in step; the dice share theirs
 * (glyphs/dice/shapes.ts).
 * @type {Record<string, (c: Colors) => string>}
 */
const GLYPHS = {
	no_dmg: (c) => box(c.hale),
	sup_dmg: (c) => box(c.superficial) + line([0, 0, 100, 100], c.superficial, 10),
	agg_dmg: (c) =>
		box(c.aggravated) +
		line([0, 0, 100, 100], c.aggravated, 10) +
		line([100, 0, 0, 100], c.aggravated, 10),
	hu_filled: (c) => diamond(c.humanity, c['humanity-stroke'], 8),
	hu_unfilled: (c) => diamond('none', c['humanity-empty'], 10),
	stain: (c) => diamond(c.stain, c.stain, 8),
	degen: (c) =>
		diamond(c.degeneration, c['degeneration-stroke'], 8) +
		line([15, 15, 85, 85], c['degeneration-stroke'], 8) +
		line([85, 15, 15, 85], c['degeneration-stroke'], 8),
	hunger: (c) => drop(c.hunger, c['hunger-stroke'], 8),
	no_hunger: (c) => drop('none', c['hunger-empty'], 10),
	// A Blood Potency pip: a disc, as the sheet's (BloodTrackers' potencyPip)
	bp: (c) => `<circle cx="50" cy="50" r="32" fill="${c.potency}"/>`,
	// An empty one: a ring, with the filled pip's outer edge
	bp_unfilled: (c) =>
		`<circle cx="50" cy="50" r="27" fill="none" stroke="${c['potency-empty']}" stroke-width="10"/>`,
	ln_fail: (c) => die(FAILURE, c.die),
	ln_succ: (c) => die(SUCCESS, c.die),
	ln_crit: (c) => die(CRITICAL, c.die),
	ln_bestial: (c) => die(BESTIAL, c.die),
	h_fail: (c) => die(FAILURE, c['hunger-die']),
	h_succ: (c) => die(SUCCESS, c['hunger-die']),
	h_crit: (c) => die(HUNGER_CRITICAL, c['hunger-die']),
	h_bestial: (c) => die(BESTIAL, c['hunger-die'])
};

/** The size of a sprite-sheet cell and of each PNG, in pixels. */
const CELL = 128;

/** The preview's sample tracks: a label and its glyphs. @type {[string, string[]][]} */
const TRACKS = [
	['Health', ['agg_dmg', 'sup_dmg', 'sup_dmg', ...Array(4).fill('no_dmg')]],
	['Willpower', ['sup_dmg', ...Array(4).fill('no_dmg')]],
	['Humanity', [...Array(6).fill('hu_filled'), 'hu_unfilled', 'stain', 'stain', 'degen']],
	['Hunger', ['hunger', 'hunger', ...Array(3).fill('no_hunger')]],
	['Potency', ['bp', 'bp', 'bp', 'bp_unfilled', 'bp_unfilled']],
	[
		'Roll',
		[
			'ln_crit',
			'ln_succ',
			'ln_succ',
			'ln_fail',
			'ln_fail',
			'h_crit',
			'h_succ',
			'h_fail',
			'h_bestial'
		]
	]
];

/**
 * A complete SVG document.
 * @param {number} width Document width
 * @param {number} height Document height
 * @param {string} body Its contents
 * @param {string} [viewBox] Its viewBox, if it differs from its size
 * @returns {string} The document
 */
const doc = (width, height, body, viewBox = `0 0 ${width} ${height}`) =>
	`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">${body}</svg>`;

/**
 * Rasterizes an SVG to a PNG file, keeping transparency.
 * @param {string} svg The SVG document
 * @param {string} out The PNG's path
 */
const writePng = (svg, out) => fs.writeFileSync(out, new Resvg(svg).render().asPng());

/** Each glyph's contents in this theme. */
const glyphs = Object.fromEntries(
	Object.entries(GLYPHS).map(([glyph, draw]) => [glyph, draw(colors)])
);
const names = Object.keys(glyphs);

const longest = Math.max(...names.map((glyph) => glyph.length));
if (theme.length + 1 + longest > 32) {
	fail(
		`"${theme}" is too long: with its emoji names, it can be at most ${31 - longest} characters.`
	);
}

/**
 * A glyph placed in a larger SVG.
 * @param {string} glyph The glyph's name
 * @param {number} x Left edge
 * @param {number} y Top edge
 * @param {number} size Width and height
 * @returns {string} A nested <svg> element
 */
const place = (glyph, x, y, size) =>
	`<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 100 100">${glyphs[glyph]}</svg>`;

const outDir = values.out ?? path.join('glyphs', theme);
// Clear earlier runs' glyphs, so a renamed or removed one can't be uploaded by mistake
for (const [folder, extension] of [
	['svg', '.svg'],
	['png', '.png']
]) {
	const dir = path.join(outDir, folder);
	fs.mkdirSync(dir, { recursive: true });
	for (const file of fs.readdirSync(dir)) {
		if (file.endsWith(extension)) fs.rmSync(path.join(dir, file));
	}
}

for (const glyph of names) {
	fs.writeFileSync(
		path.join(outDir, 'svg', `${theme}_${glyph}.svg`),
		doc(100, 100, glyphs[glyph]) + '\n'
	);
	writePng(
		doc(CELL, CELL, glyphs[glyph], '0 0 100 100'),
		path.join(outDir, 'png', `${theme}_${glyph}.png`)
	);
}

writePng(
	doc(CELL * names.length, CELL, names.map((glyph, i) => place(glyph, i * CELL, 0, CELL)).join('')),
	path.join(outDir, 'sprite-sheet.png')
);

/** The preview's glyphs per row, which wrap to fit the panel. */
const PER_ROW = 10;
/** Where the preview's tracks start, below the glyph rows. */
const TRACKS_TOP = 44 + Math.ceil(names.length / PER_ROW) * 66;
/** A preview panel's size. */
const PANEL = { width: 640, height: TRACKS_TOP + TRACKS.length * 44 + 36 };

/**
 * One preview panel: the glyphs, then sample tracks, over a background.
 * @param {number} index Its position, top to bottom
 * @param {string} caption What background it shows
 * @param {string} top The background's top color
 * @param {string} bottom The background's bottom color
 * @param {string} text The labels' color
 * @returns {string} SVG markup
 */
function panel(index, caption, top, bottom, text) {
	const y0 = index * PANEL.height;
	const label = (x, y, size, content, anchor = 'start') =>
		`<text x="${x}" y="${y}" font-family="Helvetica, Arial" font-size="${size}" fill="${text}" text-anchor="${anchor}">${content}</text>`;
	let svg =
		`<defs><linearGradient id="bg${index}" x1="0" y1="0" x2="0" y2="1">` +
		`<stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>` +
		`</linearGradient></defs>` +
		`<rect y="${y0}" width="${PANEL.width}" height="${PANEL.height}" fill="url(#bg${index})"/>`;
	svg += label(PANEL.width - 16, y0 + PANEL.height - 14, 13, caption, 'end');
	svg += names
		.map((glyph, i) =>
			place(glyph, 24 + (i % PER_ROW) * 60, y0 + 20 + Math.floor(i / PER_ROW) * 66, 52)
		)
		.join('');
	TRACKS.forEach(([name, row], r) => {
		const y = y0 + TRACKS_TOP + r * 44;
		svg += label(24, y + 21, 18, name);
		svg += row.map((glyph, i) => place(glyph, 140 + i * 30, y + 3, 24)).join('');
	});
	return svg;
}

/**
 * The preview's panels: the theme's background, then Discord's light and dark embed colors (the
 * bot's emoji only appear in embeds).
 */
const panels = [
	[`${theme} theme`, bgTop, bgBottom, colors.text],
	['Discord Light', '#FFFFFF', '#FFFFFF', '#313338'],
	['Discord Dark', '#24242A', '#24242A', '#DBDEE1']
];
writePng(
	doc(
		PANEL.width,
		PANEL.height * panels.length,
		panels.map(([caption, top, bottom, text], i) => panel(i, caption, top, bottom, text)).join('')
	),
	path.join(outDir, 'preview.png')
);

console.log(`Created the ${theme} theme in ${outDir}`);
