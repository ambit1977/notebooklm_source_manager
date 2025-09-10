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

// Copy static assets from root except src/dist/node_modules
const rootFiles = fs.readdirSync(__dirname).filter(f => !['src', 'dist', 'node_modules', '.git', 'package.json', 'package-lock.json', 'build.js'].includes(f));
for (const f of rootFiles) {
  copyRecursive(path.join(__dirname, f), path.join(DIST, f));
}

// Copy src into dist (overwrites)
copyRecursive(SRC, DIST);

console.log('Build complete. dist is ready.');
