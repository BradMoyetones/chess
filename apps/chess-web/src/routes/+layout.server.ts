import type { RequestEvent } from './$types';

export const load = async (event: RequestEvent) => {
	const session = {
		session: event.locals.session,
		user: event.locals.user
	};

	return { session };
};