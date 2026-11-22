// Checks glyph colors' contrast against a theme's background and Discord's light and dark embed
// colors, as render-glyphs.mjs's preview shows them.
//
// Usage:
//   node .claude/skills/glyph-theme/contrast.mjs --bg <top>[,<bottom>] [name=]<color>...
//
// Prints each color's WCAG contrast ratio against each background (both ends of a gradient),
// marking ratios under 3:1 (WCAG's minimum for graphics) with "!", and under 2:1 with "!!".

import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: { bg: { type: 'string' } }
});
if (!values.bg || !positionals.length) {
	console.error(
		'Usage: node .claude/skills/glyph-theme/contrast.mjs --bg <top>[,<bottom>] [name=]<color>...'
	);
	process.exit(1);
}

/**
 * A hex color's relative luminance (WCAG), as render-glyphs.mjs computes it.
 * @param {string} hex #RGB or #RRGGBB
 * @returns {number} 0 (black) to 1 (white)
 */
function luminance(hex) {
	const digits =
		hex.length === 4 ? [...hex.slice(1)].map((d) => d + d) : (hex.slice(1).match(/../g) ?? []);
	const [r, g, b] = digits.map((d) => {
		const c = parseInt(d, 16) / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Two colors' contrast ratio (WCAG).
 * @param {string} a A hex color
 * @param {string} b Another
 * @returns {number} 1 (none) to 21
 */
function contrast(a, b) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

const bg = values.bg.split(',').map((c) => c.trim());
/** The backgrounds, labelled. @type {[string, string][]} */
const backgrounds = [
	...bg.map(
		(color, i) =>
			/** @type {[string, string]} */ ([
				bg.length > 1 ? `theme ${i ? 'bottom' : 'top'}` : 'theme',
				color
			])
	),
	['Discord Light', '#FFFFFF'],
	['Discord Dark', '#24242A']
];

const rows = positionals.map((arg) => {
	const [name, color] = arg.includes('=') ? arg.split('=') : [arg, arg];
	return [name, color];
});
const width = Math.max(...rows.map(([name]) => name.length), 5);
console.log(['color'.padEnd(width), ...backgrounds.map(([label]) => label.padStart(14))].join(' '));
for (const [name, color] of rows) {
	const cells = backgrounds.map(([, back]) => {
		const ratio = contrast(color, back);
		const flag = ratio < 2 ? '!!' : ratio < 3 ? '! ' : '  ';
		return `${ratio.toFixed(2)}${flag}`.padStart(14);
	});
	console.log([name.padEnd(width), ...cells].join(' '));
}
