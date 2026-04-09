const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, 'src');
const DIST = path.resolve(__dirname, 'dist');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Clean dist
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true, force: true });
}
fs.mkdirSync(DIST, { recursive: true });

// Bump manifest minor version in src and root, and write back
// Bump strategy: use fixed major.minor (1.2) and increment patch number.
// This keeps the Store-visible major.minor stable while allowing local builds
// to increment the patch: 1.2.16 -> 1.2.17 -> ...
function bumpManifestPatchFixedMinor(manifestPath, fixedMajorMinor = '1.2') {
  if (!fs.existsSync(manifestPath)) return null;
  const raw = fs.readFileSync(manifestPath, 'utf8');
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse manifest at', manifestPath, e);
    return null;
  }
  if (!obj.version) return null;
  const cur = ('' + obj.version).split('.');
  const fixed = ('' + fixedMajorMinor).split('.').map(p => parseInt(p, 10));
  while (cur.length < 3) cur.push('0');
  // if current major.minor differs from fixed, set to fixed.patch 0
  const curMajor = parseInt(cur[0] || '0', 10);
  const curMinor = parseInt(cur[1] || '0', 10);
  const fixedMajor = parseInt(fixed[0] || '0', 10);
  const fixedMinor = parseInt(fixed[1] || '0', 10);
  let newPatch = 0;
  if (curMajor === fixedMajor && curMinor === fixedMinor) {
    // increment patch
    newPatch = parseInt(cur[2] || '0', 10) + 1;
  } else {
    // start at patch 16 as baseline if moving into fixed series
    newPatch = 16;
  }
  const newVersion = [fixedMajor, fixedMinor, newPatch].join('.');
  obj.version = newVersion;
  fs.writeFileSync(manifestPath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  return newVersion;
}

// Update both src/manifest.json and root manifest.json if present
let bumpedVersion = null;
const srcManifest = path.join(SRC, 'manifest.json');
const rootManifest = path.join(__dirname, 'manifest.json');
const FIXED_MAJOR_MINOR = '1.2';
if (fs.existsSync(srcManifest)) {
  bumpedVersion = bumpManifestPatchFixedMinor(srcManifest, FIXED_MAJOR_MINOR);
  if (bumpedVersion) console.log('Bumped src/manifest.json to', bumpedVersion);
}
if (fs.existsSync(rootManifest)) {
  // keep root manifest in sync
  const rootBumped = bumpManifestPatchFixedMinor(rootManifest, FIXED_MAJOR_MINOR);
  if (rootBumped) console.log('Bumped root manifest.json to', rootBumped);
  // prefer version from src if both exist
  if (!bumpedVersion && rootBumped) bumpedVersion = rootBumped;
}

// Copy static assets from root except src/dist/node_modules
const rootFiles = fs.readdirSync(__dirname).filter(f => !['src', 'dist', 'node_modules', '.git', 'package.json', 'package-lock.json', 'build.js'].includes(f));
for (const f of rootFiles) {
  copyRecursive(path.join(__dirname, f), path.join(DIST, f));
}

// Copy src into dist (overwrites)
copyRecursive(SRC, DIST);

// Inject manifest version into dist/filter.html so footer shows correct version even if JS doesn't run
try {
  let versionToUse = bumpedVersion || null;
  if (!versionToUse) {
    // try to read src manifest then root
    try {
      const srcM = path.join(SRC, 'manifest.json');
      if (fs.existsSync(srcM)) {
        const parsed = JSON.parse(fs.readFileSync(srcM, 'utf8'));
        versionToUse = parsed.version || versionToUse;
      }
    } catch (e) {}
    if (!versionToUse) {
      try {
        if (fs.existsSync(rootManifest)) {
          const parsed = JSON.parse(fs.readFileSync(rootManifest, 'utf8'));
          versionToUse = parsed.version || versionToUse;
        }
      } catch (e) {}
    }
  }
  if (versionToUse) {
    const filterPath = path.join(DIST, 'filter.html');
    if (fs.existsSync(filterPath)) {
      let html = fs.readFileSync(filterPath, 'utf8');
      html = html.replace(/(<span id="versionValue">)(.*?)(<\/span>)/, `$1${versionToUse}$3`);
      fs.writeFileSync(filterPath, html, 'utf8');
      console.log('Injected version', versionToUse, 'into', filterPath);
    }
  }
} catch (e) {
  console.warn('Could not inject version into filter.html', e && e.message);
}

console.log('Build complete. dist is ready.');

// If manifest was bumped, create a git commit for the bump (optional)
if (bumpedVersion) {
  try {
    const { execSync } = require('child_process');
    execSync('git add "' + srcManifest + '" "' + rootManifest + '"', { stdio: 'ignore' });
    execSync('git commit -m "chore(release): bump manifest to ' + bumpedVersion + '"', { stdio: 'ignore' });
    console.log('Committed manifest bump to git:', bumpedVersion);
  } catch (e) {
    console.warn('Could not commit manifest bump automatically:', e.message);
  }
}

// Post-process: validate and reformat locale JSON files in dist/_locales
try {
  const localesDir = path.join(DIST, '_locales');
  if (fs.existsSync(localesDir)) {
    const locales = fs.readdirSync(localesDir);
    for (const loc of locales) {
      const locPath = path.join(localesDir, loc);
      if (!fs.statSync(locPath).isDirectory()) continue;
      const files = fs.readdirSync(locPath).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const p = path.join(locPath, file);
        try {
          let raw = fs.readFileSync(p, 'utf8');
          // strip BOM if present
          if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
          const parsed = JSON.parse(raw);
          // write pretty JSON (Chrome accepts UTF-8 without BOM)
          fs.writeFileSync(p, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
        } catch (e) {
          console.error('Locale JSON invalid:', p, e.message);
          // fallback: copy from src if available
          const srcP = path.join(SRC, '_locales', loc, file);
          if (fs.existsSync(srcP)) {
            fs.copyFileSync(srcP, p);
            console.log('Replaced invalid locale with src copy:', p);
          }
        }
      }
    }
  }
} catch (e) {
  console.warn('Locale post-process failed:', e.message);
}
