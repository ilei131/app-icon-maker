---
name: app-icon-maker
description: Generate production-ready app icon packs (iOS + Android + Web) from one 1024px design, packaged as a ZIP with source-level assets. This skill should be used when the user asks to create, design, generate, or export app icons, launcher icons, ic_launcher / adaptive icons / monochrome themed icons, AppIcon.appiconset, Play Store icons, or a full-size icon resource ZIP for a mobile app. Triggers: app icon, 应用图标, 启动图标, 图标全套, 图标打包, ic_launcher, adaptive icon, AppIcon, icon pack, favicon/PWA icons.
agent_created: true
---

# App Icon Maker

Design one 1024×1024 icon, then produce every platform asset a real app needs — as a ZIP the user can drop into Xcode / Android Studio.

## What one build produces

- **iOS**: `AppIcon.appiconset` (18 slots, iPhone + iPad + 1024 marketing, alpha-free) and a Xcode 14+ single-size `AppIcon-Universal.appiconset` with **default / dark / tinted** appearances.
- **Android**: `mipmap-mdpi…xxxhdpi` legacy `ic_launcher` + `ic_launcher_round`, 108dp **adaptive** foreground/background layers, 72dp safe zone respected, `mipmap-anydpi-v26/ic_launcher.xml`, `values/ic_launcher_background.xml`, **monochrome** layer for Android 13+ themed icons, and a 512×512 Play Store icon.
- **Web/PWA**: favicon.ico, apple-touch-icon, 192/512 + maskable icons, `manifest.webmanifest`.
- **Extras**: `preview.png` + `preview.html` contact sheets, `source/` (1024 master, layers, `icon-spec.json`), `README.md` with integration steps.

## Workflow

### 1. Intake — ask once, then proceed with defaults

Collect in a single round (skip any question the user already answered): app name, core symbol/metaphor, style (flat / gradient / glass / line), palette (main + accent), background type (solid / gradient / image), target platforms. If the user supplies existing artwork or a logo, skip design entirely and build from it. If the user supplies nothing and urgency is implied, propose a direction in one sentence and build it.

### 2. Design the 1024px source

Prefer **vector**: write a foreground SVG (transparent canvas, mark inside the central 72%) and pass a `--bg` color/gradient. Start from `assets/templates/glyph-*.svg`; edit or redraw freely. Rules that are non-negotiable:

- No rounded corners, no drop shadows, no background in the foreground layer — the system adds masking and lighting.
- Silhouette must be recognizable at 20 px: solid mass, ≤ 2 visual elements, stroke ≥ 1/12 of canvas.
- Avoid text; if unavoidable keep it to one short mark.
- Gradients on thin strokes/lines break in some renderers — use filled rounded rects instead (zero-height line elements have undefined gradient bounding boxes).

For illustrative/3D-style icons, generate raster art with the image generation tool instead, then build in `--master` mode (flat art works, but adaptive layers fall back to whole-image scaling).

### 3. Build

```bash
cd <skill-dir>            # contains package.json; deps auto-install on first run
node scripts/build-icons.mjs \
  --fg symbol.svg --bg "linear-gradient(145deg,#1E1B4B,#6D28D9)" \
  --name "Aster" --out ./icon-pack
```

| Flag | Meaning |
|---|---|
| `--fg <file>` | Foreground layer SVG/PNG, transparent, 1024 canvas (best quality: enables monochrome + clean adaptive layers) |
| `--master <file>` | Full 1024 artwork (opaque), simple mode — use for AI-generated or supplied art |
| `--bg <value>` | `#0B1220` · `linear-gradient(145deg,#a,#b)` · path to an image |
| `--name` / `--slug` | App name / ZIP + folder name |
| `--out <dir>` | Output directory |
| `--fit <0-1>` | Adaptive safe-zone fill, default 0.66 (72dp of 108dp) |
| `--shape` | Legacy mask: `squircle` (default) / `rounded` / `circle` / `square`; `--radius` for rounded |
| `--dark-bg` / `--dark-fg` | Dedicated dark-appearance layer, else auto-derived |
| `--platform` | `all` / `ios` / `android` / `web` |
| `--no-zip` | Skip ZIP packaging |

### 4. Verify — always, before delivering

```bash
node scripts/verify.mjs ./icon-pack
```

Must exit 0. Then open `preview.png` (ViewImage) and judge like a designer: legibility at 20–29 px, contrast, centering. Fix the source and rebuild rather than shipping a first draft.

### 5. Deliver

Present the ZIP + `preview.png`. Summarize: platforms covered, file count, integration one-liners (drop `ios/` into `Assets.xcassets`, merge `android/app/src/main/res/` into the project, publish `web/` files). Leave deep integration detail to the generated `README.md`.

## Requirements & pitfalls (hard-won)

- iOS rejects **any alpha channel** on app icons; the pipeline flattens + strips alpha — don't bypass it.
- The iOS 1024 marketing icon must be **square, opaque, corner-free**.
- Play Store: 512×512, 32-bit PNG, ≤ 1 MB — the build fails loudly if exceeded.
- Adaptive foreground is 108dp with content in the central **72dp**; the outer 18% is cropped per-device. `placeFit` trims margins and auto-fits, so foreground SVGs only need roughly centered art.
- `monochrome` layers only generate from a transparent `--fg`; in `--master` mode they are skipped and noted — say so instead of pretending themed icons are covered.
- Dark/tinted appearance assets are derived automatically; treat them as best-effort and let the user supply `--dark-bg`/`--dark-fg` for brand-critical cases.
- iOS 26 "Liquid Glass" `.icon` files require Apple Icon Composer (macOS). This skill ships the layered `source/` assets for that workflow; note it when the user asks for glass effects.

Full size tables, Contents.json formats and per-platform integration: `references/platform-specs.md`.
Design process, palette/SVG recipes, small-size testing: `references/design-guide.md`.
