# Landing site

Static pages built from docs/VISION.md, docs/themes/*.md and git history (devlog). No dependencies.

    node site/build.mjs --base /aftermath/ --play /aftermath/play/ [--versions path/to/versions.json] [--ref HEAD]
                        [--site https://ranmacar.github.io] [--novels]

Output: `site/dist` (gitignored). Without `--versions` it reads `origin/gh-pages:versions.json`.

## URL layout on GitHub Pages

- `/aftermath/` landing (this site), `/aftermath/themes/<id>/`, `/aftermath/progress/`
- `/aftermath/play/` latest demo (built from main with `--base /aftermath/play/`)
- `/aftermath/v0.1.0/` and other `v*` tags, unchanged
- `/aftermath/versions.html|json` list of deployed versions; `latest` now points at `/aftermath/play/`

`.github/workflows/pages.yml`: a push to main builds the demo into `play/`, updates versions.*, then builds this site
and replaces the root, keeping `play/`, `v*/`, versions.* and `.nojekyll`.

## Old demo links

The demo used to live at the root. Every landing page carries a small inline script: if the URL has a demo query
parameter (`procedural`, `cad`, `key`, `asset`), it does `location.replace('/aftermath/play/' + search + hash)`.
The demo has no hash routes, so a hash on its own (e.g. `#themes`) stays on the landing. Add new demo params to the
list in `build.mjs` when the app gains them. `/aftermath/cad-preview.html` is a stub that forwards to
`/aftermath/play/cad-preview.html` the same way.

## Build checks

The build fails if any internal link or asset (href, src, CSS url()) in dist doesn't exist. Paths the deploy adds
(play/, v*/ from versions.json, versions.html/json) are allowed. Version paths from versions.json are resolved
against `--base`.

## Progress page

Commits from `--ref`, grouped by ISO week, with labels from subject prefixes (Game, CAD, Design docs, Site). A week
can have a plain-language summary in `site/progress/YYYY-Www.md`; write it from that week's commits only. Weeks
without one show their commit list open. Newest ~10 commits are shown, the rest behind "Show all".

## Hooks

Art: `site/art/<slot>.png` (hero, theme-<id>), alt text in `ALT` in build.mjs; Paula's tokens are the `:root` block
in `style.css`, fonts in `site/fonts/` (SIL OFL). Arbolis novels: only emitted with `--novels`, so nothing ships in the HTML until then.
TODO lines in VISION.md are dropped from the output.
