/**
 * L'URL peut être définie dans la balise meta campus-api-url de index.html.
 * Par défaut, l'API utilise le même hôte que le site sur le port 3000.
 */
function getApiBaseUrl(): string {
  const configured = document.querySelector<HTMLMetaElement>('meta[name="campus-api-url"]')?.content.trim();
  if (configured) {
    const url = new URL(configured, window.location.href);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL API invalide');
    return url.href.replace(/\/+$/, '');
  }
  const url = new URL(window.location.origin);
  // L'aperçu Arena expose chaque port sur un sous-domaine distinct.
  if (/^\d+-.+\.e2b\.app$/.test(url.hostname)) url.hostname = url.hostname.replace(/^\d+-/, '3000-');
  else url.port = '3000';
  return `${url.origin}/api`;
}
export const API_BASE_URL = getApiBaseUrl();
export function isApiRequest(requestUrl: string): boolean {
  const target = new URL(requestUrl, window.location.href);
  const base = new URL(API_BASE_URL);
  const path = base.pathname.replace(/\/+$/, '');
  return target.origin === base.origin && (target.pathname === path || target.pathname.startsWith(`${path}/`));
}
