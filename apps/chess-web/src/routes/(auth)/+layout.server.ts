import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (locals.session) {
		redirect(302, '/');
	}

	return { session: locals.session ?? null };
};
