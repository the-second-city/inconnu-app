/**
 * Centralized form styling and validation constants
 * Used across wizard, character editing, and other form pages
 */

export const FORM_CLASSES = {
	label: 'mb-2 block text-lg uppercase tracking-wide',
	selectInput:
		'appearance-none select select-bordered mb-3 block w-full border px-4 py-3 leading-tight',
	textInput: 'input input-bordered mb-3 block w-full border px-4 py-3 leading-tight',
	textarea: 'textarea textarea-bordered mb-3 block w-full border px-4 py-3 leading-tight',
	error: 'text-error-500 text-sm font-semibold',
	requiredIndicator: 'ml-1 text-error-500',
	buttonPrimary: 'btn preset-filled-primary-500 font-semibold hover:brightness-125',
	buttonSecondary: 'btn preset-outlined-primary-500 font-semibold'
} as const;

export const FORM_VALIDATION = {
	convictionMaxLength: 200,
	descriptionMaxLength: 1024,
	historyMaxLength: 1024,
	traitMaxLength: 20
} as const;
