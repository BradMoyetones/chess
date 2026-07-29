import axios, { type AxiosRequestConfig } from "axios";

export const api = axios.create({
    withCredentials: true,
    baseURL: import.meta.env.VITE_API_URL,
});

export interface SvelteKitAxiosConfig extends AxiosRequestConfig {
    fetchCtx?: typeof fetch;
}

// Helper para crear peticiones seguras en SSR
export const createSSRClient = (request: Request) => {
    return axios.create({
        baseURL: import.meta.env.VITE_API_URL,
        headers: {
            // Reenviamos las cookies del usuario al backend
            cookie: request.headers.get("cookie") ?? ""
        },
        adapter: 'fetch',
    });
};