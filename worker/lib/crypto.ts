const encoder = new TextEncoder();

export const PBKDF2_ITERATIONS = 100000;

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toHex(new Uint8Array(digest));
}

// Same output as Node's crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256"),
// so hashes created by the old Express server keep working.
export async function pbkdf2Hex(
  password: string,
  salt: string,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations },
    key,
    256,
  );
  return toHex(new Uint8Array(bits));
}

export function timingSafeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const actual = await pbkdf2Hex(password, salt);
  return timingSafeEqual(actual, expectedHash);
}

export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 10) problems.push("Use at least 10 characters.");
  if (!/[A-Za-z]/.test(password)) problems.push("Include at least one letter.");
  if (!/[0-9]/.test(password)) problems.push("Include at least one number.");
  if (password.length > 256) problems.push("Use at most 256 characters.");
  return problems;
}
