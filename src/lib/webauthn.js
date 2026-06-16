/**
 * webauthn.js — Cliente WebAuthn (passkeys / Face ID / Touch ID).
 * Orquestra el flujo registrar/autenticar contra empleadoApi.
 */
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from '@simplewebauthn/browser';
import { empleadoApi } from './empleadoApi';
import { webauthnHints } from './empleadoSession';

export const webauthn = {
  /** ¿El navegador soporta WebAuthn? */
  isSupported() {
    return browserSupportsWebAuthn();
  },

  /** ¿El dispositivo tiene autenticador biométrico (Face ID / Touch ID)? */
  async hasPlatformAuthenticator() {
    if (!browserSupportsWebAuthn()) return false;
    try { return await platformAuthenticatorIsAvailable(); }
    catch { return false; }
  },

  /** Registra una nueva credencial para el empleado (requiere sesión activa). */
  async register({ deviceLabel } = {}) {
    const { options } = await empleadoApi.webauthnRegisterBegin();
    if (!options?.challenge || !options?.user?.id) {
      throw new Error('Servidor devolvió opciones inválidas (challenge / user.id)');
    }
    // @simplewebauthn/browser@10 espera el objeto directo, no envuelto en { optionsJSON }
    const attResp = await startRegistration(options);
    return await empleadoApi.webauthnRegisterFinish(attResp, deviceLabel || null);
  },

  /** Autentica al empleado por número usando su credencial biométrica. */
  async loginWithBiometric(numero) {
    const { options } = await empleadoApi.webauthnLoginBegin(numero);
    if (!options?.challenge) {
      throw new Error('Servidor devolvió opciones inválidas (challenge)');
    }
    const authResp = await startAuthentication(options);
    const result = await empleadoApi.webauthnLoginFinish(numero, authResp);
    if (result?.token) webauthnHints.set(numero, true);
    return result;
  },
};
