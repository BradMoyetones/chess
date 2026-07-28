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
			const response = await fetch('http://localhost:3001/api/auth/get-session', {
				headers: { cookie: cookieHeader },
			});

			if (response.ok) {
				const data = await response.json();
				if (data?.user) {
					event.locals.user = data.user;
					event.locals.session = data.session;
				}
			}
		} catch {
			// Express server not available; user remains unauthenticated
		}
	}

	return resolve(event);
};

export const handle: Handle = handleAuth;
