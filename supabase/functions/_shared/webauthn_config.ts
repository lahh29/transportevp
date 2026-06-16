// _shared/webauthn_config.ts — Configuración compartida WebAuthn

export const WEBAUTHN_CONFIG = {
  rpID:     Deno.env.get('WEBAUTHN_RP_ID')   || 'localhost',
  rpName:   Deno.env.get('WEBAUTHN_RP_NAME') || 'ViñoPlastic',
  /** Lista de orígenes válidos, separados por coma */
  origins:  (Deno.env.get('WEBAUTHN_ORIGIN') || 'http://localhost:5173').split(',').map(s => s.trim()),
  /** Vida máxima del challenge antes de expirar (segundos) */
  challengeTTLSeconds: 300,
};
