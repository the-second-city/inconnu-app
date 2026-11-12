import { expect, test } from 'vitest';

import { match as filename } from './filename';
import { match as objectid } from './objectid';
import { match as snowflake } from './snowflake';
import { match as wizardtoken } from './wizardtoken';

// Params arrive decoded, so an encoded slash becomes a real one. Unchecked, these
// would let a request reach any path on the Inconnu API.
const TRAVERSALS = ['../../docs', '..', 'a/b', 'abc?x=1', 'abc#frag', '', ' '];

test('objectid accepts ObjectIds', () => {
	expect(objectid('680d32cbc0bf6151dbd5004e')).toBe(true);
	expect(objectid('680D32CBC0BF6151DBD5004E')).toBe(true);
});

test.each([...TRAVERSALS, '680d32cbc0bf6151dbd5004', '680d32cbc0bf6151dbd5004ef', 'z'.repeat(24)])(
	'objectid rejects %j',
	(param: string) => {
		expect(objectid(param)).toBe(false);
	}
);

test('snowflake accepts guild IDs', () => {
	expect(snowflake('1325660602579816579')).toBe(true);
});

test.each([...TRAVERSALS, '-1', '1.5', '12ab', '1'.repeat(21)])(
	'snowflake rejects %j',
	(param: string) => {
		expect(snowflake(param)).toBe(false);
	}
);

test.each(['frivolous-giraffe-wench', 'frivolous-giraffe-wench-42', 'snake_case', 'Abc123'])(
	'wizardtoken accepts %j',
	(param: string) => {
		expect(wizardtoken(param)).toBe(true);
	}
);

test.each([...TRAVERSALS, 'dotted.token', 'per%cent', 'a'.repeat(101)])(
	'wizardtoken rejects %j',
	(param: string) => {
		expect(wizardtoken(param)).toBe(false);
	}
);

test.each(['roll-example.png', 'Screen Shot 2.png', '.hidden', 'a..b.png', '100%25.png'])(
	'filename accepts %j',
	(param: string) => {
		expect(filename(param)).toBe(true);
	}
);

// Matchers see %2F still encoded, so the encoded forms matter most
test.each([
	...['..', '.', '../secret.png', 'a/b.png', 'a\\b.png', '', 'a'.repeat(256)],
	...['..%2F..%2Fcharacters', 'a%2Fb.png', 'a%5Cb.png', '%E0%A4%A']
])('filename rejects %j', (param: string) => {
	expect(filename(param)).toBe(false);
});
