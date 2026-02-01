import { writable } from 'svelte/store';

export interface CreationInfo {
	character_id: string;
	guild_name: string;
	guild_icon: string | null;
	character_name: string;
}

export const creationInfoStore = writable<CreationInfo | null>(null);
