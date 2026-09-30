/**
 * Minimal Onshape REST client shared by scripts/cad-sync.mjs and scripts/onshape-bootstrap.mjs.
 * Auth: https://onshape-public.github.io/docs/auth/apikeys/ (HMAC request signature by default; Basic with ONSHAPE_AUTH=basic).
 * Keys are read from the env or from ONSHAPE_ENV_FILE (default ~/.config/aftermath/onshape.env), and are never logged.
 */
import { createHmac, randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

// ─── Keys ────────────────────────────────────────────────────────────────────
/**
 * Loads ONSHAPE_ACCESS_KEY / ONSHAPE_SECRET_KEY from an env file if they are not already set.
 * Only ONSHAPE_* keys are read. Values are never logged.
 */
export function loadKeyFile() {
  const want = ['ONSHAPE_ACCESS_KEY', 'ONSHAPE_SECRET_KEY'];
  if (want.every((k) => process.env[k])) return;
  const file = process.env.ONSHAPE_ENV_FILE || path.join(homedir(), '.config/aftermath/onshape.env');
  if (!existsSync(file)) return;
  let n = 0;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?(ONSHAPE_[A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
    n++;
  }
  console.log(`loaded ${n} ONSHAPE_* variable(s) from ${file.replace(homedir(), '~')}`);
}

// ─── Onshape client ─────────────────────────────────────────────────────────
export class Onshape {
  constructor({ accessKey, secretKey, auth = 'hmac', baseUrl = 'https://cad.onshape.com', apiVersion = 'v11' }) {
    Object.assign(this, { accessKey, secretKey, auth, baseUrl: baseUrl.replace(/\/$/, ''), apiVersion });
  }
  url(p, query) {
    const u = new URL(`${this.baseUrl}/api/${this.apiVersion}${p}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v == null) continue;
      for (const vv of [].concat(v)) u.searchParams.append(k, String(vv));
    }
    return u.toString();
  }
  /** https://onshape-public.github.io/docs/auth/apikeys/ ("Request signature" / "Basic authorization") */
  headers(method, url, contentType, accept) {
    const h = { Accept: accept, 'Content-Type': contentType };
    if (this.auth === 'basic') {
      h.Authorization = `Basic ${Buffer.from(`${this.accessKey}:${this.secretKey}`).toString('base64')}`;
      return h;
    }
    const u = new URL(url);
    const nonce = randomBytes(24).toString('base64').replace(/[^A-Za-z0-9]/g, '').padEnd(25, '0').slice(0, 25);
    const date = new Date().toUTCString();
    const str = [method, nonce, date, contentType, u.pathname, u.search.replace(/^\?/, ''), ''].join('\n').toLowerCase();
    const hmac = createHmac('sha256', this.secretKey).update(str).digest('base64');
    h.Date = date;
    h['On-Nonce'] = nonce;
    h.Authorization = `On ${this.accessKey}:HmacSHA256:${hmac}`;
    return h;
  }
  /** fetch with signing, manual 307 handling (re-signed per the docs) and 429/5xx backoff. */
  async request(method, url, { body, accept = 'application/json;charset=UTF-8; qs=0.09', raw = false } = {}) {
    const contentType = 'application/json';
    for (let hop = 0, attempt = 0; ; ) {
      const res = await fetch(url, {
        method,
        headers: this.headers(method, url, contentType, accept),
        body: body == null ? undefined : JSON.stringify(body),
        redirect: 'manual',
      });
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const loc = res.headers.get('location');
        if (!loc || ++hop > 5) throw new Error(`${method} ${url}: bad redirect`);
        url = new URL(loc, url).toString();
        // Redirects are re-signed for the new URL (docs: "Redirects"). Log host + path only, never headers.
        if (process.env.CAD_SYNC_DEBUG) console.warn(`  ${res.status} → ${new URL(url).host}${new URL(url).pathname}`);
        if (res.status === 303) method = 'GET';
        continue;
      }
      if ((res.status === 429 || res.status >= 500) && attempt < 5) {
        const wait = Number(res.headers.get('retry-after')) * 1000 || 2000 * 2 ** attempt;
        attempt++;
        console.warn(`  … ${res.status}, retrying in ${Math.round(wait / 1000)} s`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`${method} ${new URL(url).pathname} → ${res.status} ${(await res.text()).slice(0, 300)}`);
      return raw ? new Uint8Array(await res.arrayBuffer()) : res.json();
    }
  }
  get(p, query, opts) {
    return this.request('GET', this.url(p, query), opts);
  }
  post(p, body, opts) {
    return this.request('POST', this.url(p, opts?.query), { ...opts, body });
  }
  delete(p, query, opts) {
    return this.request('DELETE', this.url(p, query), opts);
  }
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));


export function makeClient() {
  loadKeyFile();
  const { ONSHAPE_ACCESS_KEY: accessKey, ONSHAPE_SECRET_KEY: secretKey } = process.env;
  if (!accessKey || !secretKey) {
    console.error('cad-sync: ONSHAPE_ACCESS_KEY / ONSHAPE_SECRET_KEY not set and no key file found (use --dry-run or --from-file without keys)');
    process.exit(1);
  }
  return new Onshape({
    accessKey,
    secretKey,
    auth: process.env.ONSHAPE_AUTH === 'basic' ? 'basic' : 'hmac',
    baseUrl: process.env.ONSHAPE_BASE_URL || undefined,
    apiVersion: process.env.ONSHAPE_API_VERSION || undefined,
  });
}
