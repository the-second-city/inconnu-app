// place files you want to import through the `$lib` alias in this folder.

import type { Profile } from './types';

export const isValidTraitName = (name: string): boolean => {
	if (name.length === 0) return false;

	const validPattern = /^[A-Za-z_ ]+$/;
	return validPattern.test(name);
};

export const normalize = (text: string): string => {
	return text.split(/\s+/).filter(Boolean).join(' ');
};

export const insensitiveSort = (items: string[]) => {
	items.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
};

export const hasProfileContent = (profile: Profile): boolean => {
	return !!(
		(profile.description && profile.description.trim()) ||
		(profile.biography && profile.biography.trim()) ||
		(profile.images && profile.images.length > 0)
	);
};
