import { authClient } from '$lib/client';
import type { Handle } from '@sveltejs/kit';

/**
 * Server hook that obtains the user session from the Express backend.
 * SvelteKit forwards the browser's cookies to Express's Better Auth
 * endpoint, which validates the session and returns user data.
 */
const handleAuth: Handle = async ({ event, resolve }) => {
	const cookieHeader = event.request.headers.get('cookie') || '';

	if (cookieHeader) {
		try {
			const response = await authClient.getSession({
				fetchOptions: {
					headers: {
						"cookie": cookieHeader
					}
				}
			});

			if (response.data && !response.error) {
				event.locals.user = response.data.user;
				event.locals.session = response.data.session;
			}
		} catch {
			// Express server not available; user remains unauthenticated
		}
	}

	return resolve(event);
};

export const handle: Handle = handleAuth;
