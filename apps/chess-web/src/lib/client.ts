import { createAuthClient } from 'better-auth/svelte';

export const defaultCallbackURL = typeof window !== 'undefined' ? window.location.href : '/';

export const authClient = createAuthClient({
	baseURL: 'http://localhost:3001',
});