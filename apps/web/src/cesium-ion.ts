/**
 * Sealed Cesium ion token for photorealistic Look.
 *
 * Ciphertext only. The site password decrypts it in the browser and is not
 * stored here. Wrong password, or "Free maps only", leaves Look on Esri terrain.
 */
import {
  preferFreeMaps,
  unlockSealedKey,
  type EncryptedBlob,
} from "./tiles-key";

const ION_STORAGE = "aftermath:ion-token";

export const SEALED_ION_TOKEN: EncryptedBlob = {
  "salt": "1MGMobNvNISQVrFeDZLCEg==",
  "iv": "jjXhWT5dUAuXjHEN",
  "data": "grcI47996iSb0fmSwzk68qSCZpxX/wEye4FJY/+4KnbafrF+jyjZMtNJ5RGlby8Qsjoun+NUNV6Sbguvtfsu4Wisr71oVbtmc1pIsjbRFsybzRhOdeo0hdg/laozf5YZUkLuCZ4Fmsx9+6rrOuw+ItCnBIETMkRdzvoASlDusULIXL4C/W+7L8Bf3ZYvLSJG/BAlr8dgN90cYFdbUn1GPbQqEt8a/qErVWu4eiDpOVAwLswZkW9VdW7QeV/qLQDanwEhWOMAjswegIhUs76R8T0G+PxAvzpAKU7cPBrZHT8+L4ZjJ7byInbD23AMjwF+ss/Xo3BOaSpZM5MAlUsfMteY0rbd5V81NfCD3dS1kAyewiufDSETHepWY/RkZWkQnxyzVZ3AzY1nqIJTE+lctA9GgcP56nro35Efamx717HAEJOfefKJXZUoEgBNgxNciksHE6gxDd//Xs3zudcUbF5Up+zZLJ1Wtzo4XaP65oPuAthNAAirPZ9kP9D19nPBBASk8p4nh0F3aUzmliVDCdVUDO4FuSusGzmf8BdciwnsPZ9ZrVFOu3sGK4sLxM6ubvCAZx0a3blpgC0ef9q3rMlbCOSdxA6GHd6Msm5gvA/KlucXGVC74mtUjourhQEneSOuZMdKrvKxnP+5xf+oA0AdGIow+0N5cbfH5Za/t00B4TEu5zMbd9jFt9cNQU7e+VoQxW3Bdkwt",
  "iter": 250000
};

export const GOOGLE_PHOTOREALISTIC_ASSET = 2275207;

export function ionToken(): string | null {
  if (preferFreeMaps()) return null;
  try {
    const stored = sessionStorage.getItem(ION_STORAGE);
    if (stored && stored.trim()) return stored.trim();
  } catch {
    /* private mode */
  }
  return null;
}

export function setIonToken(token: string | null): void {
  try {
    if (token && token.trim()) {
      sessionStorage.setItem(ION_STORAGE, token.trim());
      sessionStorage.removeItem("aftermath:tiles-free");
    } else {
      sessionStorage.removeItem(ION_STORAGE);
    }
  } catch {
    /* ignore */
  }
}

export async function unlockIonToken(password: string): Promise<string> {
  const token = await unlockSealedKey(password, SEALED_ION_TOKEN);
  if (!token) throw new Error("empty token");
  setIonToken(token);
  return token;
}
