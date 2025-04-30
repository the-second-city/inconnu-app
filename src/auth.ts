import { SvelteKitAuth } from '@auth/sveltekit';
import Discord from '@auth/sveltekit/providers/discord';

export const { signIn, signOut, handle } = SvelteKitAuth({
	providers: [Discord],
	callbacks: {
		async session({ session }) {
			if (session.user.image === null || session.user.image === undefined) return session;

			// By design, Auth.js doesn't include the ID, but we can extract it
			// from the image.
			const regex = /avatars\/(\d+)/;
			const match = session.user.image.match(regex);
			session.user.id = match?.[1] || '';

			return session;
		}
	}
});
