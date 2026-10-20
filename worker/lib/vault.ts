const encoder = new TextEncoder();
const decoder = new TextDecoder();

function b64encode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64decode(value: string): Uint8Array<ArrayBuffer> {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importKey(secret: unknown): Promise<CryptoKey> {
  if (typeof secret !== "string" || !secret) {
    throw new Error("GMAIL_TOKEN_KEY is not configured.");
  }
  const raw = b64decode(secret.trim());
  if (raw.length !== 32) throw new Error("GMAIL_TOKEN_KEY must be 32 bytes, base64 encoded.");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(keySecret: unknown, plaintext: string): Promise<string> {
  const key = await importKey(keySecret);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plaintext)));
  const packed = new Uint8Array(iv.length + sealed.length);
  packed.set(iv);
  packed.set(sealed, iv.length);
  return `v1:${b64encode(packed)}`;
}

export async function encryptBytes(keySecret: unknown, data: ArrayBuffer): Promise<Uint8Array> {
  const key = await importKey(keySecret);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  const packed = new Uint8Array(iv.length + sealed.length);
  packed.set(iv);
  packed.set(sealed, iv.length);
  return packed;
}

export async function decryptBytes(keySecret: unknown, packed: ArrayBuffer): Promise<ArrayBuffer> {
  const key = await importKey(keySecret);
  const bytes = new Uint8Array(packed);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12));
}

export async function decryptSecret(keySecret: unknown, value: string): Promise<string> {
  if (!value.startsWith("v1:")) throw new Error("Unknown token format.");
  const key = await importKey(keySecret);
  const packed = b64decode(value.slice(3));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: packed.slice(0, 12) }, key, packed.slice(12));
  return decoder.decode(plain);
}

export function base64UrlEncode(bytes: Uint8Array): string {
  return b64encode(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecodeText(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return decoder.decode(b64decode(padded));
}

export function utf8Base64(text: string): string {
  return b64encode(encoder.encode(text));
}
