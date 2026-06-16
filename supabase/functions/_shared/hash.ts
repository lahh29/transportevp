// _shared/hash.ts — Hashing seguro de NIP con bcrypt
// bcryptjs es puro JS, funciona en Deno sin issues nativos.
// Cost factor 10 = ~80ms por hash en Edge runtime (aceptable).

import bcrypt from 'https://esm.sh/bcryptjs@2.4.3';

const ROUNDS = 10;

export const hashNip = async (nip: string): Promise<string> => {
  return await bcrypt.hash(nip, ROUNDS);
};

export const verifyNip = async (nip: string, hash: string | null): Promise<boolean> => {
  if (!hash) return false;
  try {
    return await bcrypt.compare(nip, hash);
  } catch {
    return false;
  }
};
