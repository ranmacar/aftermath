/**
 * Google Photorealistic 3D Tiles key — client-only unlock.
 *
 * Shared key (if any) is stored as AES-GCM ciphertext. The unlock password
 * never ships in the repo; it only exists in the user's head / typed input.
 * This obscures the key from casual scrapers. It is NOT strong secrecy:
 * restrict the key by HTTP referrer in Google Cloud, and prefer "enter your own".
 */

const STORAGE = "aftermath:tiles-api-key";
const UNLOCK_FLAG = "aftermath:tiles-unlocked";

export type EncryptedBlob = {
  /** base64 salt (16 bytes) */
  salt: string;
  /** base64 iv (12 bytes) */
  iv: string;
  /** base64 ciphertext+tag */
  data: string;
  /** PBKDF2 iterations */
  iter: number;
};

/**
 * Sealed shared key for GitHub Pages demos.
 * Generate with: `node scripts/encrypt-tiles-key.mjs`
 * Leave null until a key is sealed — unlock still allows paste-your-own / free maps.
 */
export const SEALED_TILES_KEY: EncryptedBlob | null = null;

export function preferFreeMaps(): boolean {
  try {
    return sessionStorage.getItem("aftermath:tiles-free") === "1";
  } catch {
    return false;
  }
}

export function getTilesKey(): string | null {
  if (preferFreeMaps()) return null;
  try {
    const s = sessionStorage.getItem(STORAGE);
    if (s && s.trim()) return s.trim();
  } catch {
    /* private mode */
  }
  const env =
    import.meta.env.VITE_GOOGLE_TILES_API_KEY ??
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (typeof env === "string" && env.trim()) return env.trim();
  const params = new URLSearchParams(window.location.search);
  const query = params.get("tilesKey") ?? params.get("key");
  if (query && query.trim()) return query.trim();
  return null;
}

export function setTilesKey(key: string | null): void {
  try {
    if (key && key.trim()) {
      sessionStorage.setItem(STORAGE, key.trim());
      sessionStorage.setItem(UNLOCK_FLAG, "1");
    } else {
      sessionStorage.removeItem(STORAGE);
      sessionStorage.removeItem(UNLOCK_FLAG);
    }
  } catch {
    /* ignore */
  }
}


function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iter: number,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: iter,
      hash: "SHA-256",
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt", "encrypt"],
  );
}

/** Decrypt sealed blob with password. Throws on bad password / corrupt data. */
export async function unlockSealedKey(
  password: string,
  blob: EncryptedBlob = SEALED_TILES_KEY!,
): Promise<string> {
  if (!blob) throw new Error("No sealed key in this build");
  const salt = b64ToBytes(blob.salt);
  const iv = b64ToBytes(blob.iv);
  const data = b64ToBytes(blob.data);
  const key = await deriveKey(password, salt, blob.iter);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    data as BufferSource,
  );
  return new TextDecoder().decode(plain).trim();
}

export async function encryptTilesKey(
  plaintext: string,
  password: string,
  iter = 250_000,
): Promise<EncryptedBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iter);
  const enc = new TextEncoder();
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    enc.encode(plaintext.trim()),
  );
  const toB64 = (u: Uint8Array) => {
    let s = "";
    for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]!);
    return btoa(s);
  };
  return {
    salt: toB64(salt),
    iv: toB64(iv),
    data: toB64(new Uint8Array(cipher)),
    iter,
  };
}
