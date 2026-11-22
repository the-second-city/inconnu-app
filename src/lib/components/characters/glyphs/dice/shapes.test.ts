import { expect, test } from 'vitest';
import { BESTIAL, CRITICAL, dieFace, FAILURE, facePaths, HUNGER_CRITICAL, SUCCESS } from './shapes';

test.each([
	[1, false, 'failure'],
	[5, false, 'failure'],
	[6, false, 'success'],
	[9, false, 'success'],
	[10, false, 'critical'],
	[1, true, 'bestial'],
	[2, true, 'failure'],
	[6, true, 'success'],
	[10, true, 'critical']
] as const)('a %i (Hunger die: %s) is a %s', (value, hunger, face) => {
	expect(dieFace(value, hunger)).toBe(face);
});

test.each([
	['failure', false, FAILURE],
	['success', true, SUCCESS],
	['critical', false, CRITICAL],
	['critical', true, HUNGER_CRITICAL],
	['bestial', false, BESTIAL]
] as const)('a %s face (Hunger: %s) draws its paths', (face, hunger, paths) => {
	expect(facePaths(face, hunger)).toBe(paths);
});
