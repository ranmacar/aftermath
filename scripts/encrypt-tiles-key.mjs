#!/usr/bin/env node
/**
 * Seal a Google Map Tiles API key for client-side password unlock.
 *
 * Usage:
 *   TILES_KEY='AIza…' UNLOCK_PASSWORD='…' node scripts/encrypt-tiles-key.mjs
 *
 * Prints a TypeScript EncryptedBlob literal to paste into
 * apps/web/src/tiles-key.ts as SEALED_TILES_KEY.
 *
 * Password is never written to disk by this script.
 */
import { webcrypto } from "node:crypto";

const crypto = webcrypto;

const keyPlain = process.env.TILES_KEY?.trim();
const password = process.env.UNLOCK_PASSWORD ?? "";
const iter = Number(process.env.PBKDF2_ITER ?? 250_000);

if (!keyPlain) {
  console.error("Set TILES_KEY to the Google Map Tiles API key.");
  process.exit(1);
}
if (!password || password.length < 4) {
  console.error("Set UNLOCK_PASSWORD (site unlock password, min 4 chars).");
  process.exit(1);
}

function toB64(u) {
  return Buffer.from(u).toString("base64");
}

async function deriveKey(password, salt, iterations) {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
}

const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const key = await deriveKey(password, salt, iter);
const cipher = await crypto.subtle.encrypt(
  { name: "AES-GCM", iv },
  key,
  new TextEncoder().encode(keyPlain),
);

const blob = {
  salt: toB64(salt),
  iv: toB64(iv),
  data: toB64(new Uint8Array(cipher)),
  iter,
};

console.log("Paste into apps/web/src/tiles-key.ts:\n");
console.log(
  `export const SEALED_TILES_KEY: EncryptedBlob | null = ${JSON.stringify(blob, null, 2)};`,
);
