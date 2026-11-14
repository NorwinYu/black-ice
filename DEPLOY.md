# Deploy to GitHub Pages

The site is completely static. The publishable folder is **`docs/`**:

> **Common mistake:** publishing from **`/ (root)`** instead of **`/docs`**.
> The repo root has no `index.html`; GitHub Pages' Jekyll README index then renders
> `README.md` as the site home and `game.html` remains at `/game.html`.
> `docs/index.html` is the actual Pages entry (a byte-identical copy of `game.html`).

```
docs/index.html       the game
docs/process.html     feature gallery, iteration record, verification, skill credit
docs/shots/*.jpg      optimized screenshots
docs/.nojekyll        keep all asset paths served as-is
```

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
- **Folder:** `/docs`
- **Save**

GitHub publishes the folder at:

```
https://<your-account>.github.io/<repo>/
```

The game is at `.../` (index.html) and the process page at `.../process.html`.

## 3. Check the deployment

- The title screen loads with the live 3D scene behind it.
- Click **DEPLOY** and the pointer locks; `Esc` pauses.
- The process page loads all screenshots from `docs/shots/` (relative paths).
- There are no external requests; the browser console is clean apart from standard
  browser messaging.

## Notes

- If the Pages URL shows the README instead of the game, change the Pages folder from
  `/ (root)` to `/docs`; no code changes are needed.
- If you insist on a root deployment, copy `docs/index.html` to the repository root as
  `index.html`, and copy `docs/process.html` and `docs/shots/` to the root too. The
  `/docs` source is cleaner and is what the README's links assume.
- A custom domain: add a `CNAME` file inside `docs/` with your domain, then configure
  the domain in **Settings → Pages**. Do not add a custom domain unless you own it.
- No analytics are included. If you add any later, update the privacy statement on
  the process page and in `README.md`.
- The site is static; there is no build step required on GitHub.
