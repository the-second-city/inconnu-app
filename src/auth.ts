import { SvelteKitAuth } from '@auth/sveltekit';
import Discord from '@auth/sveltekit/providers/discord';

export const { signIn, signOut, handle } = SvelteKitAuth({
	providers: [Discord],
	session: {
		strategy: 'jwt'
	},
	callbacks: {
		async jwt({ token, account, profile }) {
			// Store Discord user ID in the token when user signs in
			if (account && profile) {
				token.discordId = profile.id;
			}
			return token;
		},
		async session({ session, token }) {
			// Add Discord user ID to the session
			if (token.discordId) {
				session.user.id = token.discordId as string;
			}
			return session;
		}
	}
});
