import * as OTPAuth from "otpauth";

const TOTP_STORAGE_KEY = "stellar_vault_2fa";
const ADMIN_TOTP_STORAGE_KEY = "stellar_vault_admin_2fa";
const SESSION_KEY = "stellar_vault_2fa_session";
const ADMIN_SESSION_KEY = "stellar_vault_admin_2fa_session";

export const generate2FASecret = (label: string = "StellarVault"): { secret: string; uri: string } => {
  const totp = new OTPAuth.TOTP({
    issuer: "StellarVaultGuard",
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });
  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
};

export const verify2FAToken = (secret: string, token: string): boolean => {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
};

export const save2FASecret = (secret: string, isAdmin = false) => {
  localStorage.setItem(isAdmin ? ADMIN_TOTP_STORAGE_KEY : TOTP_STORAGE_KEY, secret);
};

export const get2FASecret = (isAdmin = false): string | null => {
  return localStorage.getItem(isAdmin ? ADMIN_TOTP_STORAGE_KEY : TOTP_STORAGE_KEY);
};

export const remove2FASecret = (isAdmin = false) => {
  localStorage.removeItem(isAdmin ? ADMIN_TOTP_STORAGE_KEY : TOTP_STORAGE_KEY);
};

export const set2FASession = (isAdmin = false) => {
  const key = isAdmin ? ADMIN_SESSION_KEY : SESSION_KEY;
  // Session valid for 30 minutes
  localStorage.setItem(key, String(Date.now() + 30 * 60 * 1000));
};

export const is2FASessionValid = (isAdmin = false): boolean => {
  const key = isAdmin ? ADMIN_SESSION_KEY : SESSION_KEY;
  const expiry = localStorage.getItem(key);
  if (!expiry) return false;
  return Date.now() < Number(expiry);
};

export const clear2FASession = (isAdmin = false) => {
  localStorage.removeItem(isAdmin ? ADMIN_SESSION_KEY : SESSION_KEY);
};
