# Deploy to GitHub Pages

The site is completely static and published from the **repository root**:

```
index.html          the game (site root, unique canonical build)
process.html        feature gallery, iteration record, verification, skill credit
docs/shots/*.jpg    documentation stills used by README and process.html
.nojekyll           serve the root as static files (no Jekyll/README index)
```

There is exactly **one game build** (`index.html`). `docs/` contains documentation
stills only; it has no game HTML and no duplicate process page.

Nothing is built on the host and no server-side code is used.

## 1. Create the repository

Create an empty repository on GitHub, then from this folder:

```bash
git init
git add .
git commit -m "BLACK ICE: procedural first-person shooter"
git branch -M main
git remote add origin https://github.com/<your-account>/<repo>.git
git push -u origin main
```

Replace `<your-account>` and `<repo>`. Do not commit credentials, tokens, `.env`
files or personal data. The included `.gitignore` excludes the raw development
captures, the local skill harness and OS files.

## 2. Enable Pages

In the GitHub repository:

**Settings → Pages → Build and deployment**

- **Source:** Deploy from a branch
- **Branch:** `main`
- **Folder:** `/ (root)`
- **Save**

GitHub publishes the repository at:

```
https://<your-account>.github.io/<repo>/
```

- **`/`** → `index.html` (the game)
- **`/process.html`** → the feature gallery / iteration record
- **`/docs/shots/`** → the stills

The root `.nojekyll` is what stops GitHub Pages' Jekyll README index from turning
`README.md` into the site home. With `index.html` present, the game is the home page;
the repository page on GitHub still shows `README.md` as usual.

## 3. Check the deployment

- The title screen loads with the live 3D scene behind it.
- Click **DEPLOY** and the pointer locks; `Esc` pauses.
- `/process.html` loads all screenshots from `docs/shots/`.
- There are no external requests; the browser console is clean apart from standard
  browser messaging.

## Notes

- If the Pages URL shows the README instead of the game, check that `index.html` and
  `.nojekyll` exist at the repository root (they do in this repo), wait for the Pages
  build, and hard-refresh. The current repository uses `main / (root)`.
- Do not add a second copy of the game to `docs/`; the site has one canonical build.
- A custom domain: add a `CNAME` file at the repository root, then configure the
  domain in **Settings → Pages**. Do not add a custom domain unless you own it.
- No analytics are included. If you add any later, update the privacy statement in
  `README.md` and `process.html`.
- The site is static; there is no build step required on GitHub.
