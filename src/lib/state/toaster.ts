/**
 * The app's toasts: brief notices in the window's corner, which `Toaster` (in the root layout)
 * shows. Call `toaster.warning({ title, description })` (or `info`, `success`, `error`).
 */

import { createToaster } from '@skeletonlabs/skeleton-svelte';

// Top right, under the header, clear of the phone's floating buttons at the bottom
export const toaster = createToaster({
	placement: 'top-end',
	offsets: { top: '5rem', right: '1rem', bottom: '1rem', left: '1rem' },
	gap: 12,
	max: 4
});
