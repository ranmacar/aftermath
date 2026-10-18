// Builds the static landing site into site/dist from docs/ and git history. No deps.
// Usage: node site/build.mjs [--base /aftermath/] [--play /aftermath/play/] [--versions f] [--site https://ranmacar.github.io] [--novels]
import fs from 'node:fs'; import path from 'node:path'; import {execSync} from 'node:child_process';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i+1] : d; };
const BASE = arg('--base', '/aftermath/'), PLAY = arg('--play', '/aftermath/play/');
const VERSIONS = arg('--versions', '');
const SITE = arg('--site', 'https://ranmacar.github.io');
const REPO = 'https://github.com/ranmacar/aftermath';
const out = path.join(root, 'site/dist'); fs.rmSync(out, {recursive:true, force:true}); fs.mkdirSync(out, {recursive:true});
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const THEMES = ['stewardship','sanctuary-not-conquest','tree-habitats-agroforestry','resilience-seed-pods','long-game','open-design'];
const linkFix = h => { // docs links -> site pages
  const m = h.match(/(?:themes\/)?([\w-]+)\.md$/); if (m && THEMES.includes(m[1])) return `${BASE}themes/${m[1]}/`;
  if (/^https?:/.test(h)) return h; return `${REPO}/blob/main/docs/${h}`; };
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>')
  .replace(/`(.+?)`/g,'<code>$1</code>').replace(/\[(.+?)\]\((.+?)\)/g,(_,t,h)=>`<a href="${linkFix(h)}">${t}</a>`);
function md(src, {dropTodo=true}={}) {
  const lines = src.split('\n'); let html='', list=null, para=[];
  const flush = () => { if (para.length) html += `<p>${inline(para.join(' '))}</p>\n`; para=[]; if (list) { html += `</${list}>\n`; list=null; } };
  for (const l of lines) {
    if (dropTodo && /^\s*>?\s*TODO/.test(l)) continue;
    if (dropTodo && /^Draft for Martin/.test(l)) continue;
    let m;
    if (!l.trim()) { flush(); continue; }
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { flush(); const n=Math.min(m[1].length,4); html += `<h${n}>${inline(m[2])}</h${n}>\n`; continue; }
    if ((m = l.match(/^\s*(?:[-*]|(\d+)\.)\s+(.*)/))) { if (para.length){const p=para;para=[];html+=`<p>${inline(p.join(' '))}</p>\n`;} const t = m[1]?'ol':'ul'; if (list!==t){ if(list) html+=`</${list}>\n`; html+=`<${t}>\n`; list=t;} html += `<li>${inline(m[2])}</li>\n`; continue; }
    if ((m = l.match(/^>\s?(.*)/))) { flush(); html += `<blockquote>${inline(m[1])}</blockquote>\n`; continue; }
    para.push(l.trim());
  }
  flush(); return html;
}
const title = src => src.match(/^#\s+(.*)/m)[1];
const lede = src => src.split('\n\n').find(p => p.trim() && !p.startsWith('#'))?.trim() ?? '';
const nav = cur => `<a class="skip" href="#main">Skip to content</a><nav class="nav"><a class="brand" href="${BASE}">Aftermath</a><div class="links">
<a href="${BASE}#themes"${cur==='themes'?' aria-current="page"':''}>Themes</a><a href="${BASE}progress/"${cur==='progress'?' aria-current="page"':''}>Progress</a>
<a class="play" href="${PLAY}">Play demo</a></div></nav>`;
// Old demo links (/aftermath/?procedural=1, ?cad=, ?key=, #...) now land here: forward them to the demo,
// keeping query and hash. The demo has no hash routes, so a hash alone stays on the landing (#themes etc.). See site/README.md.
const redirect = `<script>(function(){var q=new URLSearchParams(location.search);
var demo=["procedural","cad","key","asset"].some(function(k){return q.has(k)});
if(demo)location.replace(${JSON.stringify(PLAY)}+location.search+location.hash);})();</script>`;
const NOVELS = process.argv.includes('--novels'); // novels section is left out of the HTML entirely unless set
const DESC = 'A slow browser game played on the real map: wake a buried seed pod after a solar storm, grow a tower, and turn one hex of land into a living farm.';
const footer = home => `<footer><p>Found a bug or have an idea? <a href="${REPO}/issues">Open an issue on GitHub</a>.</p>
<p>${home ? '' : `Code <a href="${REPO}/blob/main/LICENSE">MIT</a> · story, art and docs CC BY-SA 4.0 · hardware designs CERN-OHL-S-2.0 · `}<a href="${REPO}">Source on GitHub</a></p></footer>`;
const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='M16 2l12 7v14l-12 7-12-7V9z' fill='%2318201B'/%3E%3Crect x='14' y='9' width='4' height='14' fill='%23E9A94B'/%3E%3C/svg%3E";
const page = (t, body, cur='', {before='', home=false, desc=DESC, url='', image='hero'}={}) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t)}</title>
<meta name="description" content="${esc(desc)}"><meta name="theme-color" content="#18201B">
<link rel="canonical" href="${SITE}${BASE}${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Aftermath">
<meta property="og:title" content="${esc(t)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${BASE}${url}"><meta property="og:image" content="${SITE}${BASE}art/${image}.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${FAVICON}"><link rel="stylesheet" href="${BASE}style.css">${redirect}</head><body>${nav(cur)}${before}<main id="main">${body}</main>
${footer(home)}</body></html>`;
// Art: Paula's placeholders (site/art/*.png). Alt text describes the picture; replace with renders later.
const ALT = {
  hero: 'Dawn over one hex of living land: a tower with a solar crown and lit windows in a ring of round crop beds and food forest, a dead city faint on the horizon.',
  'theme-stewardship': 'Top-down hex with rain flowing towards the tower through swales and trees.',
  'theme-sanctuary-not-conquest': 'The tower at dusk with small lights walking home across the fields.',
  'theme-tree-habitats-agroforestry': 'Cross-section of the tower as a tree: caisson root, core trunk, solar canopy and beds at ground level.',
  'theme-resilience-seed-pods': 'A buried upright container in its shell among soil layers, with a warm seam of light as it wakes.',
  'theme-long-game': 'Night map of hexes with green lit pods spreading out from a centre.',
  'theme-open-design': 'Blueprint of the farm ring with 18 round beds, 6 inner and 12 outer, and dimension lines.',
};
const art = (slot, {eager=false, decorative=false}={}) => `<figure class="art" data-art-slot="${slot}"><picture><source type="image/webp" srcset="${BASE}art/${slot}.webp"><img src="${BASE}art/${slot}.png" alt="${decorative ? '' : esc(ALT[slot])}" width="1600" height="900" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'}></picture></figure>`;
const write = (rel, html) => { const f = path.join(out, rel); fs.mkdirSync(path.dirname(f), {recursive:true}); fs.writeFileSync(f, html); };

// --- data
const vision = fs.readFileSync(path.join(root,'docs/VISION.md'),'utf8');
const sect = name => { const m = vision.split(/^## /m).find(s => s.startsWith(name)); return m ? m.slice(name.length).trim() : ''; };
const SHORT = {'long-game': 'The long game', stewardship: 'Stewardship'}; // card titles; the full title stays on the page
const themes = THEMES.map(id => { const src = fs.readFileSync(path.join(root,`docs/themes/${id}.md`),'utf8'); return {id, src, t: title(src), card: SHORT[id] ?? title(src), lede: lede(src)}; });
let versions = {versions:[]}; try { versions = JSON.parse(VERSIONS ? fs.readFileSync(VERSIONS,'utf8') : execSync('git show origin/gh-pages:versions.json',{cwd:root}).toString()); } catch {}
// versions.json paths carry the deploy prefix (/aftermath/v0.1.0/); resolve them against BASE so any --base works.
const vpath = p => BASE + String(p).replace(/^\/[^/]+\//, '');
const log = execSync(`git log --format=%H%x09%ad%x09%s --date=short ${arg('--ref','HEAD')}`,{cwd:root}).toString().trim().split('\n').map(l=>{const [h,d,s]=l.split('\t');return {h,d,s};});
const tags = {}; execSync('git tag --format="%(refname:short) %(objectname)"',{cwd:root}).toString().trim().split('\n').filter(Boolean).forEach(l=>{const [t,h]=l.split(' ');tags[h]=t;});

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const human = d => { const [y,m,dd] = String(d).slice(0,10).split('-'); return `${+dd} ${MONTHS[m-1]} ${y}`; };
const playNext = `<p class="next"><a class="btn" href="${PLAY}">Play the demo</a></p>`;
const lead = inline(sect('The project in one paragraph').replace('one real hex at a time', 'one real hex (a patch of about 1.5 ha) at a time'));
const about = md(sect("What we're trying to do").replace('the Agrokruh ring', 'the Agrokruh ring (a ring-shaped farm layout)'));
const glossLede = s => s.replace('a geopolymer caisson', 'a caisson, a buried shell of geopolymer concrete');

// --- landing. Order (Bucky 7): hero + CTA, demo, themes, not, roadmap, about, licences, (novels)
const hero = `<div class="hero-band"><section class="hero">
<div class="hero-text"><h1>Rebuild one real place after the grid goes dark.</h1>
<p class="tagline">A browser game: wake a buried seed pod after a solar storm, grow a tower, and bring one real patch of land back to life.</p>
<p class="cta"><a class="btn" href="${PLAY}">Play the demo</a> <span class="note">Free, in your browser. An early prototype: you can walk, dig, build and farm, but there's no survival loop yet.</span></p>
<p class="lead">${lead}</p></div>${art('hero',{eager:true})}</section></div>`;
const latest = versions.latest;
write('index.html', page('Aftermath', `
<section id="demo"><h2>The current demo</h2>
<p>In the demo you can:</p><ul><li>dig out of a basement</li><li>follow a signal to a buried pod and find it on the map</li><li>build: solar, dig, rise, and watch the tower go up</li><li>farm the ring of round beds around the tower</li></ul>
<p>It runs on phones and desktops, in the browser, with no install. It's a prototype, so expect rough edges.</p>
<ul class="versions"><li><a href="${PLAY}"${latest ? ` title="main @ ${esc(latest.sha.slice(0,7))}"` : ''}>Latest build<span class="label">Prototype</span><small>${latest ? `updated ${human(latest.builtAt)}` : ''}</small></a></li>
${versions.versions.map(v=>`<li><a href="${vpath(v.path)}" title="${esc(v.ref)} @ ${esc((v.sha||'').slice(0,7))}">${esc(v.version)}<small>earlier build (procedural, no CAD models), ${human(v.builtAt)}</small></a></li>`).join('')}
<li><a href="${BASE}versions.html">All versions</a></li></ul></section>
<section id="themes"><h2>What it's about</h2><p>Six ideas under the mechanics. Each has a short page.</p><ul class="cards">
${themes.map(t=>`<li class="card">${art('theme-'+t.id,{decorative:true})}<h3><a href="${BASE}themes/${t.id}/">${inline(t.card)}</a></h3><p>${inline(glossLede(t.lede))}</p></li>`).join('\n')}</ul></section>
<section id="not"><h2>What this is not</h2><ul><li>Not a city builder. One tower per hex, by design.</li><li>Not a survival shooter.</li>
<li>Not a building guide. Planning rules in most of Europe wouldn't allow a tower like this today; the game is partly an argument that they should.</li></ul>
<p class="is">What it is: a slow game about tending one place until it comes back.</p></section>
<section id="roadmap"><h2>Roadmap</h2><p>No dates, because we'd miss them. In order:</p><ol>
<li><strong>Now: the demo.</strong> The playable demo (see above). Mostly there.</li>
<li><strong>Next: your home hex.</strong> Survive outside, forage, find other survivors, move into the tower, plant the ring, get the radio working.</li>
<li><strong>Then: neighbours.</strong> Contact reveals other pods; you can seed a second tower next door that runs on the first one's power.</li>
<li><strong>Later: airships.</strong> Trade between groups, multiplayer.</li></ol>
<p>Alongside it: publish the CAD as open designs once they're tested enough to be useful.</p>
<p><a class="more" href="${BASE}progress/">What's been built so far →</a></p></section>
<section id="about"><h2>What we're trying to do</h2>${about}</section>
${NOVELS ? `<section id="novels" class="night" data-slot="arbolis-novels"><h2>The novels</h2><p>The same world is told in novels.</p><ul class="novel-links"></ul></section>` : ''}
<section id="licences"><h2>Open by default. Take it, build it, fix it.</h2>
<p>You can play, copy and change the code (MIT), reuse the story and art with credit (CC BY-SA 4.0), and build or modify the hardware designs (CERN-OHL-S-2.0).</p></section>`, '', {before: hero, home: true}));

// --- themes: H1 from the markdown, full-width art, all-themes list and a Play link at the end
themes.forEach(t => {
  write(`themes/${t.id}/index.html`, page(`${t.card} · Aftermath`, `<article class="theme">${md(t.src)}</article>
<nav class="others" aria-label="Themes"><h2>Other themes</h2><ul>${themes.map(o => o.id === t.id ? `<li aria-current="page">${inline(o.card)}</li>` : `<li><a href="${BASE}themes/${o.id}/">${inline(o.card)}</a></li>`).join('')}</ul></nav>${playNext}`,
  'themes', {before: `<div class="theme-art">${art('theme-'+t.id,{eager:true})}</div>`, desc: t.lede, url: `themes/${t.id}/`, image: 'theme-'+t.id})); });

// --- progress: real commits grouped by ISO week. Summaries come from site/progress/YYYY-Www.md, written from those
// commits only; weeks without one show the commit list open. Subject prefixes become category labels.
const monday = d => { const t = new Date(d+'T12:00:00Z'); t.setUTCDate(t.getUTCDate() - (t.getUTCDay()+6)%7); return t; };
const isoWeek = d => { const t = monday(d); t.setUTCDate(t.getUTCDate()+3); const y = t.getUTCFullYear();
  const j4 = monday(`${y}-01-04`); return `${y}-W${String(1 + Math.round((t - j4 - 3*864e5) / (7*864e5))).padStart(2,'0')}`; };
const cat = s => { const m = s.match(/^(docs(?:\/design)?|CAD|Models):\s*/i);
  if (m) return {label: /^docs/i.test(m[1]) ? 'Design docs' : 'CAD', text: s.slice(m[0].length).replace(/^./, c => c.toUpperCase())};
  return {label: /onshape|asset pipeline/i.test(s) ? 'CAD' : /pages deploy/i.test(s) ? 'Site' : 'Game', text: s}; };
const weeks = {}; log.forEach(c => (weeks[isoWeek(c.d)] ??= {start: monday(c.d).toISOString().slice(0,10), cs: []}).cs.push(c));
const row = c => { const {label, text} = cat(c.s); return `<li><a href="${REPO}/commit/${c.h}"><span class="cat">${label}</span>${tags[c.h]?`<span class="tag">${esc(tags[c.h])}</span>`:''}<span class="msg">${inline(text)}</span><small class="sha">${human(c.d)} · ${c.h.slice(0,7)}</small></a></li>`; };
const weekHtml = ([w, {start, cs}]) => { const f = path.join(root, `site/progress/${w}.md`);
  const sum = fs.existsSync(f) ? `<p class="summary">${inline(fs.readFileSync(f,'utf8').trim())}</p>` : '';
  return `<section class="week"><h2><time datetime="${w}">Week of ${human(start)}</time></h2>${sum}
<details${sum ? '' : ' open'}><summary>${cs.length} change${cs.length>1?'s':''}</summary><ul class="commits">${cs.map(row).join('\n')}</ul></details></section>`; };
const allWeeks = Object.entries(weeks);
let shown = 0; const cut = (allWeeks.findIndex(([, {cs}]) => (shown += cs.length) >= 10) + 1) || allWeeks.length;
write('progress/index.html', page('Progress · Aftermath', `<h1>Progress</h1>
<p>What changed, week by week. Each line links to the actual code change. Plans live in the <a href="${BASE}#roadmap">roadmap</a>.</p>
${allWeeks.slice(0, cut).map(weekHtml).join('\n')}
${cut < allWeeks.length ? `<details class="older"><summary>Show all</summary>${allWeeks.slice(cut).map(weekHtml).join('\n')}</details>` : ''}${playNext}`, 'progress', {url: 'progress/', desc: 'What has changed in Aftermath, week by week, taken from the project history.'}));
// Stub for the old /aftermath/cad-preview.html URL.
write('cad-preview.html', `<!doctype html><meta charset="utf-8"><title>Moved</title><meta name="robots" content="noindex">
<script>location.replace(${JSON.stringify(PLAY+'cad-preview.html')}+location.search+location.hash)</script>
<p><a href="${PLAY}cad-preview.html">CAD preview moved here</a></p>`);
fs.copyFileSync(path.join(root,'site/style.css'), path.join(out,'style.css'));
for (const d of ['fonts','art']) fs.cpSync(path.join(root,'site',d), path.join(out,d), {recursive:true, filter: f => !f.endsWith('.py')});

// --- link check: every internal href/src must exist in dist, or under a path the deploy provides (demo, versions).
const external = [PLAY, BASE+'versions.html', BASE+'versions.json', ...versions.versions.map(v => vpath(v.path))];
const bad = [];
const walk = d => fs.readdirSync(d,{withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(d,e.name)) : [path.join(d,e.name)]);
for (const f of walk(out).filter(f => /\.(html|css)$/.test(f))) {
  const txt = fs.readFileSync(f,'utf8');
  for (const [, u] of [...txt.matchAll(/(?:href|src|srcset)="([^"#? ]+)|url\(["']?([^"')#?]+)/g)].map(m => [m[0], m[1] ?? m[2]])) {
    if (/^(https?:|data:|mailto:)/.test(u)) continue;
    const abs = u.startsWith('/') ? u : path.posix.join('/' + path.relative(out, path.dirname(f)).split(path.sep).join('/'), u).replace(/^\/+/, '/');
    const absB = u.startsWith('/') ? abs : BASE + abs.slice(1);
    if (!absB.startsWith(BASE)) { bad.push(`${path.relative(out,f)}: ${u} (outside base)`); continue; }
    if (external.some(e => absB === e || absB.startsWith(e) && e.endsWith('/'))) continue;
    let rel = absB.slice(BASE.length); if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    if (!fs.existsSync(path.join(out, rel))) bad.push(`${path.relative(out,f)}: ${u}`);
  }
}
if (bad.length) { console.error('Broken internal links:\n  ' + [...new Set(bad)].join('\n  ')); process.exit(1); }
console.log('built', out, 'base', BASE, 'play', PLAY);
