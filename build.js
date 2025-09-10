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
function bumpManifestMinor(manifestPath) {
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
  const parts = obj.version.split('.').map(p => parseInt(p, 10));
  while (parts.length < 3) parts.push(0);
  // increment minor (parts[1]) and reset patch
  parts[1] = (isNaN(parts[1]) ? 0 : parts[1]) + 1;
  parts[2] = 0;
  const newVersion = parts.join('.');
  obj.version = newVersion;
  fs.writeFileSync(manifestPath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  return newVersion;
}

// Update both src/manifest.json and root manifest.json if present
let bumpedVersion = null;
const srcManifest = path.join(SRC, 'manifest.json');
const rootManifest = path.join(__dirname, 'manifest.json');
if (fs.existsSync(srcManifest)) {
  bumpedVersion = bumpManifestMinor(srcManifest);
  if (bumpedVersion) console.log('Bumped src/manifest.json to', bumpedVersion);
}
if (fs.existsSync(rootManifest)) {
  // keep root manifest in sync
  const rootBumped = bumpManifestMinor(rootManifest);
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
