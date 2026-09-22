/**
 * Startup unlock: password decrypts the sealed Cesium ion token in this
 * browser, or the visitor continues on free maps.
 */
import { ionToken, setIonToken, unlockIonToken } from "./cesium-ion";
import { primeGeolocation } from "./locate";
import { preferFreeMaps, setTilesKey } from "./tiles-key";

export type UnlockResult =
  | { mode: "ion"; source: "sealed" | "session" }
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
  if (ionToken()) {
    return Promise.resolve({ mode: "ion", source: "session" });
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
      "Photorealistic Look is locked. Enter the site password, or continue on free satellite terrain.",
    );

    const pwdLabel = el("label", "unlock-label", "Site password");
    pwdLabel.htmlFor = "unlock-password";
    const pwd = el("input", "unlock-input") as HTMLInputElement;
    pwd.id = "unlock-password";
    pwd.type = "password";
    pwd.autocomplete = "current-password";
    pwd.placeholder = "Password";

    const err = el("p", "unlock-error");
    err.hidden = true;

    const row = el("div", "unlock-actions");
    const unlockBtn = el("button", "unlock-btn unlock-btn-primary", "Unlock") as HTMLButtonElement;
    unlockBtn.type = "button";
    const freeBtn = el("button", "unlock-btn unlock-btn-ghost", "Free maps only") as HTMLButtonElement;
    freeBtn.type = "button";

    const note = el(
      "p",
      "unlock-note",
      "The password only decrypts a sealed token in this browser. It is not sent anywhere.",
    );

    function finishIon(): void {
      root.remove();
      resolve({ mode: "ion", source: "sealed" });
    }

    function finishFree(): void {
      setIonToken(null);
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
      primeGeolocation();
      void (async () => {
        err.hidden = true;
        const password = pwd.value;
        if (!password) {
          showErr("Enter the site password.");
          return;
        }
        unlockBtn.disabled = true;
        try {
          await unlockIonToken(password);
          finishIon();
        } catch {
          showErr("Wrong password.");
          unlockBtn.disabled = false;
        }
      })();
    });

    freeBtn.addEventListener("click", () => {
      primeGeolocation();
      finishFree();
    });

    pwd.addEventListener("keydown", (e) => {
      if (e.key === "Enter") unlockBtn.click();
    });
    row.append(unlockBtn, freeBtn);
    card.append(title, blurb, pwdLabel, pwd, err, row, note);
    root.append(card);
    document.body.append(root);
    pwd.focus();
  });
}
