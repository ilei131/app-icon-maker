#!/usr/bin/env node
/**
 * verify.mjs — assert an icon pack against platform requirements.
 *   node scripts/verify.mjs ./icon-pack
 * Exit code 0 = all pass, 1 = at least one hard failure.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const DIR = path.resolve(process.argv[2] || './icon-pack');
const IOS_EXPECT = {
  'icon-iphone-20x20@2x.png': 40, 'icon-iphone-20x20@3x.png': 60,
  'icon-iphone-29x29@2x.png': 58, 'icon-iphone-29x29@3x.png': 87,
  'icon-iphone-40x40@2x.png': 80, 'icon-iphone-40x40@3x.png': 120,
  'icon-iphone-60x60@2x.png': 120, 'icon-iphone-60x60@3x.png': 180,
  'icon-ipad-20x20@1x.png': 20, 'icon-ipad-20x20@2x.png': 40,
  'icon-ipad-29x29@1x.png': 29, 'icon-ipad-29x29@2x.png': 58,
  'icon-ipad-40x40@1x.png': 40, 'icon-ipad-40x40@2x.png': 80,
  'icon-ipad-76x76@1x.png': 76, 'icon-ipad-76x76@2x.png': 152,
  'icon-ipad-83.5x83.5@2x.png': 167, 'icon-ios-marketing-1024x1024@1x.png': 1024,
};
const ANDROID_EXPECT = {
  mdpi: { legacy: 48, adaptive: 108 }, hdpi: { legacy: 72, adaptive: 162 },
  xhdpi: { legacy: 96, adaptive: 216 }, xxhdpi: { legacy: 144, adaptive: 324 },
  xxxhdpi: { legacy: 192, adaptive: 432 },
};

const results = [];
const check = (ok, level, label, detail = '') => {
  results.push({ ok, level, label, detail });
  const mark = ok ? 'PASS' : level === 'warn' ? 'WARN' : 'FAIL';
  console.log(`[${mark}] ${label}${detail ? ' — ' + detail : ''}`);
};

async function meta(p) {
  const m = await sharp(p).metadata();
  return { w: m.width, h: m.height, alpha: m.hasAlpha, channels: m.channels, size: (await fs.stat(p)).size };
}

async function main() {
  const iosDir = path.join(DIR, 'ios/AppIcon.appiconset');
  let contents;
  try { contents = JSON.parse(await fs.readFile(path.join(iosDir, 'Contents.json'), 'utf8')); }
  catch { check(false, 'error', 'iOS Contents.json exists'); }

  if (contents) {
    const files = new Set();
    for (const img of contents.images) {
      const f = path.join(iosDir, img.filename);
      files.add(img.filename);
      try {
        const m = await meta(f);
        const [w, h] = img.size.split('x').map(Number);
        const scale = Number(img.scale.replace('x', ''));
        const expect = Math.round(w * scale);
        check(m.w === expect && m.h === expect, 'error', `iOS ${img.filename}`, `${m.w}x${m.h} (expected ${expect})`);
        // App Store requires an opaque icon (no alpha channel) for every slot
        check(m.alpha === false || m.channels === 3, 'error', `iOS ${img.filename} opaque`, `channels=${m.channels}`);
        if (img.idiom === 'ios-marketing') {
          check(m.size <= 1024 * 1024 * 5, 'warn', 'iOS 1024 size', `${(m.size / 1024 / 1024).toFixed(2)} MB`);
        }
      } catch {
        check(false, 'error', `iOS ${img.filename} readable`);
      }
    }
    const missing = Object.keys(IOS_EXPECT).filter((f) => !files.has(f));
    check(missing.length === 0, 'error', 'iOS full size matrix', missing.length ? `missing ${missing.join(', ')}` : `${files.size} images`);
  }

  for (const [d, exp] of Object.entries(ANDROID_EXPECT)) {
    const base = path.join(DIR, `android/app/src/main/res/mipmap-${d}`);
    for (const [name, px] of [['ic_launcher.png', exp.legacy], ['ic_launcher_round.png', exp.legacy], ['ic_launcher_foreground.png', exp.adaptive]]) {
      const p = path.join(base, name);
      try {
        const m = await meta(p);
        check(m.w === px && m.h === px, 'error', `Android ${d}/${name}`, `${m.w}x${m.h} (expected ${px})`);
      } catch { check(false, 'error', `Android ${d}/${name} exists`); }
    }
    try {
      const mono = await meta(path.join(base, 'ic_launcher_monochrome.png'));
      check(mono.w === exp.adaptive, 'error', `Android ${d}/monochrome`, `${mono.w}x${mono.h}`);
    } catch { check(true, 'warn', `Android ${d}/monochrome`, 'skipped (no foreground layer)'); }
  }

  for (const f of ['android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
    'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml',
    'android/play-store-icon-512.png']) {
    try { await fs.access(path.join(DIR, f)); check(true, 'error', f); }
    catch { check(false, 'error', f, 'missing'); }
  }

  try {
    const store = await meta(path.join(DIR, 'android/play-store-icon-512.png'));
    check(store.w === 512 && store.h === 512, 'error', 'Play Store icon dims', `${store.w}x${store.h}`);
    check(store.size <= 1024 * 1024, 'error', 'Play Store icon <= 1MB', `${(store.size / 1024).toFixed(0)} KB`);
  } catch { /* reported above */ }

  const fails = results.filter((r) => !r.ok && r.level === 'error').length;
  const warns = results.filter((r) => !r.ok && r.level === 'warn').length;
  console.log(`\n${results.length - fails - warns} passed, ${warns} warnings, ${fails} failures`);
  process.exit(fails ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
