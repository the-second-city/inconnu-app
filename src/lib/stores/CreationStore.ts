import { writable } from 'svelte/store';
import type { Guild } from '$lib/types';

export interface CreationInfo {
	character_id: string;
	guild: Guild;
	character_name: string;
}

export const creationInfoStore = writable<CreationInfo | null>(null);
