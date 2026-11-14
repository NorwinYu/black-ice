# BLACK ICE · 白夜站

A playable first-person shooter built **from code**, in **one self-contained HTML file**.
No external models, textures, audio, fonts, reference frames, analytics, or network requests.

[**Play the game**](docs/index.html) · [**Feature gallery & process**](docs/process.html) · [**Deploy to GitHub Pages**](DEPLOY.md)

![BLACK ICE title screen](docs/shots/title.jpg)

> A failing listening post at the edge of the Arctic Circle. Wake three relay towers,
> hold the yard against the station's own guard machines, and bring down the Warden
> before it seals the sky.

---

## What is in the game

| | |
|---|---|
| **Objective chain** | ALPHA relay → BRAVO relay → CHARLIE relay → destroy Warden Prime |
| **Hostiles** | Raider (rifle), Wasp (hovering drone), Heavy (shield + shotgun), Warden Prime (boss) |
| **Tools** | AR-9 rifle + ARC-9 arc coil (chains up to 3 targets, cooldown) |
| **Player verbs** | move, sprint, jump, aim, fire, reload, switch, interact |
| **World** | an arctic outpost: three relay masts, huts, garage, radome, fuel depot, 16 m comms mast, perimeter drifts, three mountain layers |
| **Shell** | title, settings, pause, help, save, lost, won, touch controls |
| **Session** | 6–10 minutes; best score and settings persist locally |

### Controls

`WASD` move · `Shift` sprint · `Space` jump · mouse look · **LMB** fire · **RMB** aim
· `R` reload · `E` interact · `Q` / `1` / `2` switch tool · `Esc` pause · `M` mute.
On touch: left stick, right-drag look, fire / aim / reload / interact / jump / swap.

### Run it

```bash
python3 -m http.server 8000
# open http://localhost:8000/game.html
```

Opening `game.html` directly also works; a local server is recommended for pointer lock.

---

## Built with the `photoreal-game` skill

This project followed the **photoreal-game** skill — a procedure for building
playable, photorealistic 3D games from code. The skill shaped:

- the **render-observable harness** (`__READY`, `__STATS`, `__PRODUCT`, fixed cameras, `?shot`, `?seed`);
- the **art-direction brief** and the product-first order (shell and loop before grading);
- the **per-object craft budget**, census, collision parity, light anchoring and identity rules;
- the **headless playtest**, finished-product gate and 390×844 mobile gate;
- the **one-lever-per-round** iteration loop with fixed cameras and kept screenshots.

The project's **look gate uses the skill's declared fallback** (tone and emptiness)
because the brief explicitly forbade reference material, so no project profile was
captured from another subject.

The verification harness comes from the skill and is **not redistributed** in this
repository. The recorded acceptance results and commands are in
[`NOTES.md`](NOTES.md) and on the [process page](docs/process.html).

---

## Build and verify

Source lives in `src/`; the build concatenates it into `game.html`.

```bash
node build.mjs
```

The recorded acceptance run passed **8 / 8** gates:

```
shaders  census  collide  lights  playtest  product  mobile  look
```

- Product: 163 draw calls, 127,337 triangles, 12 lights. Final build re-check: product / playtest / mobile PASS.
- Look fallback: hero 77.5% / close 75.2% / wide 72.0% midtones; flat tiles 3% / 0% / 7%.
- Playtest: ALPHA → BRAVO → CHARLIE completes; lethal damage produces a named cause,
  an end screen, and a clean reset.
- Mobile: 390×844, no horizontal overflow, touch UI present.

The full gate log, iteration notes, screenshots and known limitations are in
[`NOTES.md`](NOTES.md) and [`docs/process.html`](docs/process.html).

---

## Repository layout

```
game.html            playable single-file build
src/                 original source (engine, world, enemies, game, UI)
build.mjs            src/* -> game.html
docs/index.html      the same game, served by GitHub Pages
docs/process.html    feature gallery + iteration record + verification
docs/shots/          optimized screenshots used by the site
NOTES.md             build log, art brief, gates, limitations
DEPLOY.md            GitHub Pages steps
```

`/shots/` (raw development captures), `/tools/` (skill harness) and `/refs/`
are local-only and excluded by `.gitignore`.

---

## Privacy

No analytics, cookies, accounts, tracking pixels, external fonts or third-party
requests. The game stores only `blackice.best` and `blackice.settings` in the
browser's local storage. The site is static; nothing is sent to a server.

## Credits

Original code, procedural art and synthesized audio were produced for this project.
The **photoreal-game** skill supplied the procedure and gate design; its harness is
credited but not redistributed here. No reference material or external asset is used.
