export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8081/api';
export const NOMBRE = import.meta.env.VITE_NOMBRE ?? 'tú';
export const PAREJA_NOMBRE = import.meta.env.VITE_PAREJA_NOMBRE ?? 'tu pareja';

const CLAVE_TOKEN = 'app_token';

// En dev local VITE_APP_TOKEN viene del .env (comodidad, nadie más ve ese build).
// En producción no se define esa variable — el token solo vive en localStorage,
// donde lo deja la pantalla de acceso (gate.ts) tras validarlo contra la API real.
const TOKEN_DEV = import.meta.env.VITE_APP_TOKEN as string | undefined;

export const getToken = (): string | null => TOKEN_DEV ?? localStorage.getItem(CLAVE_TOKEN);
export const setToken = (t: string) => localStorage.setItem(CLAVE_TOKEN, t);
export const clearToken = () => localStorage.removeItem(CLAVE_TOKEN);
