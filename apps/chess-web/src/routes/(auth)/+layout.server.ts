import { auth } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '../$types';

export const load = async (event: RequestEvent) => {
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	if (session) {
		redirect(302, '/');
	}

	return { session };
};
