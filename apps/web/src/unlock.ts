/**
 * Startup unlock: password → decrypt sealed Google Tiles key,
 * or paste your own key, or continue on free maps only.
 */
import {
  SEALED_TILES_KEY,
  getTilesKey,
  preferFreeMaps,
  setTilesKey,
  unlockSealedKey,
} from "./tiles-key";

export type UnlockResult =
  | { mode: "google"; source: "sealed" | "pasted" | "env" }
  | { mode: "free" };

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

/**
 * Shows the unlock modal unless this session already has a key / chose free.
 * Resolves when the user unlocks, pastes a key, or continues with free maps.
 */
export function ensureTilesUnlock(): Promise<UnlockResult> {
  if (preferFreeMaps()) {
    return Promise.resolve({ mode: "free" });
  }
  if (getTilesKey()) {
    return Promise.resolve({ mode: "google", source: "env" });
  }

  return new Promise((resolve) => {
    const root = el("div", "unlock");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "unlock-title");

    const card = el("div", "unlock-card");
    const title = el("h1", "unlock-title", "Map tiles");
    title.id = "unlock-title";
    const blurb = el(
      "p",
      "unlock-blurb",
      "Photorealistic Look mode needs a Google Map Tiles API key. Unlock the shared demo key with the site password, paste your own, or continue on free OpenFreeMap / satellite terrain.",
    );

    const pwdLabel = el("label", "unlock-label", "Site password");
    pwdLabel.htmlFor = "unlock-password";
    const pwd = el("input", "unlock-input") as HTMLInputElement;
    pwd.id = "unlock-password";
    pwd.type = "password";
    pwd.autocomplete = "current-password";
    pwd.placeholder = SEALED_TILES_KEY ? "Password" : "No sealed key in this build";
    pwd.disabled = !SEALED_TILES_KEY;

    const ownLabel = el("label", "unlock-label", "Or your own API key");
    ownLabel.htmlFor = "unlock-own";
    const own = el("input", "unlock-input") as HTMLInputElement;
    own.id = "unlock-own";
    own.type = "password";
    own.autocomplete = "off";
    own.placeholder = "AIza… (optional)";

    const err = el("p", "unlock-error");
    err.hidden = true;

    const row = el("div", "unlock-actions");
    const unlockBtn = el("button", "unlock-btn unlock-btn-primary", "Unlock") as HTMLButtonElement;
    unlockBtn.type = "button";
    unlockBtn.disabled = !SEALED_TILES_KEY;
    const ownBtn = el("button", "unlock-btn", "Use my key") as HTMLButtonElement;
    ownBtn.type = "button";
    const freeBtn = el("button", "unlock-btn unlock-btn-ghost", "Free maps only") as HTMLButtonElement;
    freeBtn.type = "button";

    const note = el(
      "p",
      "unlock-note",
      "Password is used only in this browser to decrypt a sealed key. Nothing is sent to our servers. Restrict demo keys by HTTP referrer in Google Cloud.",
    );

    function finishGoogle(source: "sealed" | "pasted"): void {
      try {
        sessionStorage.removeItem("aftermath:tiles-free");
      } catch {
        /* ignore */
      }
      root.remove();
      resolve({ mode: "google", source });
    }

    function finishFree(): void {
      setTilesKey(null);
      try {
        sessionStorage.setItem("aftermath:tiles-free", "1");
      } catch {
        /* ignore */
      }
      root.remove();
      resolve({ mode: "free" });
    }

    function showErr(msg: string): void {
      err.textContent = msg;
      err.hidden = false;
    }

    unlockBtn.addEventListener("click", () => {
      void (async () => {
        err.hidden = true;
        if (!SEALED_TILES_KEY) {
          showErr("No sealed demo key in this build — paste your own or use free maps.");
          return;
        }
        const password = pwd.value;
        if (!password) {
          showErr("Enter the site password.");
          return;
        }
        unlockBtn.disabled = true;
        try {
          const key = await unlockSealedKey(password);
          if (!key) throw new Error("empty key");
          setTilesKey(key);
          finishGoogle("sealed");
        } catch {
          showErr("Wrong password or corrupt sealed key.");
          unlockBtn.disabled = false;
        }
      })();
    });

    ownBtn.addEventListener("click", () => {
      err.hidden = true;
      const key = own.value.trim();
      if (!key) {
        showErr("Paste your Google Map Tiles API key, or choose free maps.");
        return;
      }
      setTilesKey(key);
      finishGoogle("pasted");
    });

    freeBtn.addEventListener("click", () => finishFree());

    pwd.addEventListener("keydown", (e) => {
      if (e.key === "Enter") unlockBtn.click();
    });
    own.addEventListener("keydown", (e) => {
      if (e.key === "Enter") ownBtn.click();
    });

    row.append(unlockBtn, ownBtn, freeBtn);
    card.append(title, blurb, pwdLabel, pwd, ownLabel, own, err, row, note);
    root.append(card);
    document.body.append(root);
    (SEALED_TILES_KEY ? pwd : own).focus();
  });
}
