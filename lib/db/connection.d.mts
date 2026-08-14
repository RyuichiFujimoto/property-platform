export type SslConfig = 'require' | false | { rejectUnauthorized: false };

export function normalizeConnectionString(databaseUrl: string): string;
export function hostOf(databaseUrl: string): string | null;
export function sslConfigFor(databaseUrl: string, mode?: string): SslConfig;
