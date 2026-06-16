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
    const attResp = await startRegistration({ optionsJSON: options });
    return await empleadoApi.webauthnRegisterFinish(attResp, deviceLabel || null);
  },

  /** Autentica al empleado por número usando su credencial biométrica. */
  async loginWithBiometric(numero) {
    const { options } = await empleadoApi.webauthnLoginBegin(numero);
    const authResp = await startAuthentication({ optionsJSON: options });
    const result = await empleadoApi.webauthnLoginFinish(numero, authResp);
    if (result?.token) webauthnHints.set(numero, true);
    return result;
  },
};
