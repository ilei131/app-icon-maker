# Platform Icon Specs (2026)

Authoritative tables the build script encodes. Consult when adding platforms or debugging an Xcode/Gradle rejection.

## iOS — AppIcon.appiconset (classic full matrix)

| Slot (pt) | Scale | Pixels | Idiom |
|---|---|---|---|
| 20 | 2x / 3x | 40 / 60 | iphone |
| 29 | 2x / 3x | 58 / 87 | iphone |
| 40 | 2x / 3x | 80 / 120 | iphone |
| 60 | 2x / 3x | 120 / 180 | iphone |
| 20 | 1x / 2x | 20 / 40 | ipad |
| 29 | 1x / 2x | 29 / 58 | ipad |
| 40 | 1x / 2x | 40 / 80 | ipad |
| 76 | 1x / 2x | 76 / 152 | ipad |
| 83.5 | 2x | 167 | ipad |
| Marketing | 1x | 1024 | ios-marketing |

Hard requirements:

- **Opaque** — App Store validation rejects alpha channels (`channels=3` after build).
- **No pre-baked rounded corners** — iOS applies the squircle mask.
- 1024 marketing icon: square, sRGB/Display-P3, ≤ 5 MB.
- Filenames are free-form; `Contents.json` is the contract. Generated names: `icon-<idiom>-<size>@<scale>.png` (unique per slot — avoid duplicate filenames across idioms, Xcode complains).

### Single-size catalog (Xcode 14+)

```json
{ "images" : [
    { "filename" : "icon-1024.png", "idiom" : "universal", "platform" : "ios", "size" : "1024x1024" },
    { "appearances" : [{ "appearance" : "luminosity", "value" : "dark" }],
      "filename" : "icon-1024-dark.png", "idiom" : "universal", "platform" : "ios", "size" : "1024x1024" },
    { "appearances" : [{ "appearance" : "luminosity", "value" : "tinted" }],
      "filename" : "icon-1024-tinted.png", "idiom" : "universal", "platform" : "ios", "size" : "1024x1024" }
  ],
  "info" : { "author" : "xcode", "version" : 1 } }
```

- **dark**: darker background, same symbol; avoid pure black on black wallpapers.
- **tinted**: the system maps image luminance to the user's tint color — ship a grayscale with strong value separation.
- Xcode 26 / iOS 26 Liquid Glass: layered `.icon` via Icon Composer (macOS only). A flat catalog still ships and renders normally; glass is opt-in.

## Android

### Launcher densities (legacy, API < 26)

| Density | ic_launcher / ic_launcher_round |
|---|---|
| mdpi | 48 |
| hdpi | 72 |
| xhdpi | 96 |
| xxhdpi | 144 |
| xxxhdpi | 192 |

### Adaptive icons (API 26+)

- Canvas **108×108dp** per layer; only the central **72×72dp** is guaranteed visible (outer 18% cropped/masked per device). Visible circle ≈ 66dp diameter.
- Layer pixel sizes: mdpi 108 → hdpi 162 → xhdpi 216 → xxhdpi 324 → xxxhdpi 432.
- `mipmap-anydpi-v26/ic_launcher.xml`:

```xml
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/> <!-- or @color/... -->
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/> <!-- optional -->
</adaptive-icon>
```

- **Monochrome / themed icons (Android 13+)**: white-or-black shape with alpha on transparent canvas; the system recolors it. Generate from the foreground's alpha only.
- Solid-color backgrounds → `values/ic_launcher_background.xml`; gradients/images → raster `ic_launcher_background.png` per density.

### Play Store

- 512×512, 32-bit PNG, ≤ 1 MB, alpha allowed.
- Also commonly needed (not icon pack scope): feature graphic 1024×500.

## Web / PWA

| File | Size | Notes |
|---|---|---|
| favicon.ico | 16/32/48 | PNG-in-ICO container |
| apple-touch-icon | 180 | opaque, no mask (iOS rounds it) |
| icon-192 / icon-512 | – | manifest icons |
| icon-512-maskable | 512 | content within central 80% safe zone |
| manifest.webmanifest | – | `icons[]` with `purpose: "maskable"` entry |

## Integration quick reference

- **Xcode**: drag `ios/AppIcon.appiconset` into `Assets.xcassets` (or set Single Size and drop the three 1024 PNGs of `AppIcon-Universal.appiconset`).
- **Android Studio / Flutter / RN / Capacitor**: merge `android/app/src/main/res/*` into `android/app/src/main/res/`; manifest needs `android:icon="@mipmap/ic_launcher"` and `android:roundIcon="@mipmap/ic_launcher_round"`.
- **Flutter note**: this pack replaces `flutter_launcher_icons` config; or point that tool at `source/master-1024.png`.
- **Verify in CI**: `node scripts/verify.mjs <pack>` exits non-zero on dimension/alpha/size violations.

## Design review checklist before shipping

1. 20–29 px legibility (Settings/Spotlight size).
2. All three iOS appearances + Android circle mask + themed icon silhouette.
3. No baked corners/shadows/text.
4. Colors tested against light and dark wallpapers.
