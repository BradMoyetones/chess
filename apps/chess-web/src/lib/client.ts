import { createAuthClient } from 'better-auth/svelte';

export const defaultCallbackURL = typeof window !== 'undefined' ? window.location.href : '/';

export const authClient = createAuthClient({
	baseURL: 'http://localhost:3001',
});

export const AVAILABLE_PROVIDERS = [
  { id: "google", name: "Google" },
  { id: "discord", name: "Discord" },
] as const;

export const ERROR_MESSAGES: Record<string, string> = {
	// Errores de usuario (los que sí pueden solucionar)
	"email_doesn't_match": "El correo de la cuenta social no coincide con tu usuario actual.",
	"credential_account_already_exists": "Esta cuenta social ya está vinculada a otro usuario.",
	"user_already_exists": "Ya existe un usuario con este correo. Inicia sesión primero.",
	"access_denied": "Acceso denegado o cancelado en el proveedor social.",
	
	// Errores técnicos (mensaje más suave)
	"unable_to_link_account": "No pudimos vincular la cuenta. Inténtalo de nuevo.",
	"state_mismatch": "La sesión expiró por seguridad. Por favor reinicia el proceso.",
	
	// Fallback (por defecto)
	"default": "Ocurrió un error inesperado al conectar con el servidor."
};