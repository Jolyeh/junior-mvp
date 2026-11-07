/** Classifie sans exposer l'URL PostgreSQL ou les informations sensibles. */
export function databaseErrorKind(error: unknown): 'auth' | 'unreachable' | 'schema' | null {
  const seen = new Set<unknown>();
  function inspect(value: unknown, depth: number): 'auth' | 'unreachable' | 'schema' | null {
    if (!value || typeof value !== 'object' || seen.has(value) || depth > 6) return null;
    seen.add(value);
    const item = value as Record<string, any>;
    const code = String(item.code || item.originalCode || '');
    const message = typeof item.message === 'string' ? item.message : '';
    if (['P1000', '28P01', '28000'].includes(code) || /authentication failed against the database|password authentication failed|invalid authorization specification/i.test(message)) return 'auth';
    if (['P1001', 'P1017', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(code) || /can't reach database server|connection refused/i.test(message)) return 'unreachable';
    if (['P2021', 'P2022', '42P01', '42703'].includes(code)) return 'schema';
    for (const nested of [item.cause, item.meta, item.driverAdapterError, item.error]) { const result = inspect(nested, depth + 1); if (result) return result; }
    return null;
  }
  return inspect(error, 0);
}
export function databaseDiagnostic(kind: 'auth' | 'unreachable' | 'schema'): string {
  if (kind === 'auth') return 'Authentification PostgreSQL refusée. Vérifiez DATABASE_URL dans backend/.env : utilisateur, mot de passe et encodage des caractères spéciaux. Ce ne sont pas les identifiants du compte ESM BÉNIN.';
  if (kind === 'unreachable') return 'PostgreSQL est inaccessible. Vérifiez que le serveur est démarré et contrôlez l’hôte et le port dans DATABASE_URL de backend/.env.';
  return 'Le schéma PostgreSQL est incomplet ou incompatible. Vérifiez les migrations et appliquez le schéma après sauvegarde.';
}
