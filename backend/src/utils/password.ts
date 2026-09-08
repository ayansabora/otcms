import argon2 from "argon2";

// Argon2id is the OWASP-recommended password hash — resistant to both
// GPU-cracking (unlike bcrypt/scrypt-only attacks) and side-channel attacks
// (unlike pure Argon2i/Argon2d). Parameters below follow OWASP's current
// baseline guidance for interactive login; revisit if server hardware changes.
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // Malformed hash, algorithm mismatch, etc. — treat as failed verification,
    // never throw during login (that would leak information via error type).
    return false;
  }
}

/**
 * Secure password policy, enforced server-side regardless of any frontend check.
 * Minimum 12 characters, at least one letter and one number. We deliberately
 * avoid overly complex composition rules (NIST 800-63B guidance) in favor of length.
 */
const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d).{12,128}$/;

export function isPasswordCompliant(plain: string): boolean {
  return PASSWORD_POLICY.test(plain);
}
